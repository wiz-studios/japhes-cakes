import { NextResponse, after } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"
import { sendSmtpMail } from "@/lib/smtp"
import { checkRateLimit } from "@/lib/rate-limit"
import { fetchWithTimeout } from "@/lib/http"
import { getClientIp, getRequestId, logWithRequestId } from "@/lib/request-meta"

const inquirySchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim(),
  course: z.string().trim().min(2, "Course interest is required"),
  message: z.string().trim().max(1000).optional().default(""),
  captchaToken: z.string().optional(),
})

function getTransportConfig() {
  const host = process.env.EMAIL_HOST
  const port = Number(process.env.EMAIL_PORT || "")
  const secure = `${process.env.EMAIL_SECURE}`.toLowerCase() === "true"
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  const from = process.env.EMAIL_FROM
  const to = process.env.EMAIL_TO || user

  if (!host || !port || !user || !pass || !from || !to) {
    return null
  }

  return { host, port, secure, user, pass, from, to }
}

async function verifyCaptcha(token?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false

  const formData = new URLSearchParams()
  formData.set("secret", secret)
  formData.set("response", token)

  const result = await fetchWithTimeout("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
    timeoutMs: Number(process.env.TURNSTILE_TIMEOUT_MS || 4000),
  })

  if (!result.ok) return false
  const payload = (await result.json()) as { success?: boolean }
  return payload.success === true
}

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

function getAnonSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null
  return createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
}

function getInquiryInsertClient(): SupabaseClient | null {
  return getAdminSupabase() || getAnonSupabase()
}

async function createInquiryLead(input: {
  name: string
  phone: string
  course: string
  message: string
  source: string
}) {
  const supabase = getInquiryInsertClient()
  if (!supabase) {
    console.error("[school-inquiry] No Supabase credentials available for inquiry persistence")
    return null
  }

  const payload = {
    name: input.name,
    phone: input.phone,
    course: input.course,
    message: input.message,
    source: input.source,
    status: "new",
    email_sent: false,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("school_inquiries").insert(payload).select("id").single()
  if (error) {
    console.error("[school-inquiry] Failed to persist inquiry", error)
    return null
  }

  return data?.id || null
}

async function markInquiryEmailSent(id: string) {
  const supabase = getAdminSupabase()
  if (!supabase) return

  const { error } = await supabase
    .from("school_inquiries")
    .update({ email_sent: true, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("[school-inquiry] Failed to mark inquiry email_sent", error)
  }
}

function buildInquiryEmailText(input: {
  submittedAt: string
  ip: string
  name: string
  phone: string
  course: string
  message: string
  requestId: string
}) {
  return [
    "NEW SCHOOL INQUIRY",
    "-------------------",
    "",
    "Lead Details",
    `- Name: ${input.name}`,
    `- Phone: ${input.phone}`,
    `- Course Interest: ${input.course}`,
    `- Message: ${input.message || "No message provided"}`,
    "",
    "Submission Info",
    `- Submitted: ${input.submittedAt}`,
    `- Source IP: ${input.ip}`,
    `- Request ID: ${input.requestId}`,
    "",
    "Suggested Next Step",
    "- Contact this lead on phone/WhatsApp and update status in Admin > School Inquiries.",
    "",
    "- Japhe's Cakes & Pizza",
  ].join("\n")
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const ip = getClientIp(request)

  try {
    const limit = checkRateLimit(`school-inquiry:${ip}`, 5, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, message: "Too many inquiries. Please try again shortly.", requestId },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = inquirySchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid inquiry details"
      return NextResponse.json({ ok: false, message, requestId }, { status: 400 })
    }

    const captchaOk = await verifyCaptcha(parsed.data.captchaToken)
    if (!captchaOk) {
      return NextResponse.json({ ok: false, message: "Captcha verification failed.", requestId }, { status: 400 })
    }

    const normalizedPhone = normalizeKenyaPhone(parsed.data.phone)
    if (!KENYA_PHONE_REGEX.test(normalizedPhone)) {
      return NextResponse.json(
        { ok: false, message: "Enter a valid phone number (07/01 format).", requestId },
        { status: 400 }
      )
    }

    const inquiryId = await createInquiryLead({
      name: parsed.data.name,
      phone: normalizedPhone,
      course: parsed.data.course,
      message: parsed.data.message || "",
      source: "website",
    })

    const config = getTransportConfig()
    if (config) {
      const submittedAt = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })
      const message = buildInquiryEmailText({
        submittedAt,
        ip,
        name: parsed.data.name,
        phone: normalizedPhone,
        course: parsed.data.course,
        message: parsed.data.message || "",
        requestId,
      })

      after(async () => {
        try {
          await sendSmtpMail({
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.user,
            pass: config.pass,
            from: config.from,
            to: config.to,
            subject: `School Inquiry: ${parsed.data.course} - ${parsed.data.name}`,
            text: message,
          })
          if (inquiryId) await markInquiryEmailSent(inquiryId)
          logWithRequestId(requestId, "[school-inquiry] Email delivered", { inquiryId: inquiryId || undefined })
        } catch (emailError) {
          console.error(`[${requestId}] [school-inquiry] Email delivery failed`, emailError)
        }
      })
    } else {
      logWithRequestId(requestId, "[school-inquiry] Email transport not configured; lead saved only")
    }

    return NextResponse.json({ ok: true, message: "Inquiry sent successfully.", requestId })
  } catch (error) {
    console.error(`[${requestId}] [school-inquiry] Failed to process inquiry`, error)
    return NextResponse.json(
      { ok: false, message: "Unable to send inquiry right now. Please try again shortly.", requestId },
      { status: 500 }
    )
  }
}
