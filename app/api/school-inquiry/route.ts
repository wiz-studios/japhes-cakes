import { NextResponse } from "next/server"
import { z } from "zod"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"
import { sendSmtpMail } from "@/lib/smtp"
import { checkRateLimit } from "@/lib/rate-limit"

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

  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  })

  if (!result.ok) return false
  const payload = (await result.json()) as { success?: boolean }
  return payload.success === true
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const limit = checkRateLimit(`school-inquiry:${ip}`, 5, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ ok: false, message: "Too many inquiries. Please try again shortly." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = inquirySchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid inquiry details"
      return NextResponse.json({ ok: false, message }, { status: 400 })
    }

    const captchaOk = await verifyCaptcha(parsed.data.captchaToken)
    if (!captchaOk) {
      return NextResponse.json({ ok: false, message: "Captcha verification failed." }, { status: 400 })
    }

    const normalizedPhone = normalizeKenyaPhone(parsed.data.phone)
    if (!KENYA_PHONE_REGEX.test(normalizedPhone)) {
      return NextResponse.json({ ok: false, message: "Enter a valid phone number (07/01 format)." }, { status: 400 })
    }

    const config = getTransportConfig()
    if (!config) {
      return NextResponse.json({ ok: false, message: "Email is not configured. Please contact support." }, { status: 500 })
    }

    const submittedAt = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })

    await sendSmtpMail({
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      pass: config.pass,
      from: config.from,
      to: config.to,
      subject: `School Inquiry: ${parsed.data.course} - ${parsed.data.name}`,
      text: [
        "New School Inquiry",
        `Submitted: ${submittedAt}`,
        `IP: ${ip}`,
        "",
        `Name: ${parsed.data.name}`,
        `Phone: ${normalizedPhone}`,
        `Course Interest: ${parsed.data.course}`,
        `Message: ${parsed.data.message || "N/A"}`,
      ].join("\n"),
    })

    return NextResponse.json({ ok: true, message: "Inquiry sent successfully." })
  } catch (error) {
    console.error("[school-inquiry] Failed to send email", error)
    return NextResponse.json({ ok: false, message: "Unable to send inquiry right now. Please try again shortly." }, { status: 500 })
  }
}
