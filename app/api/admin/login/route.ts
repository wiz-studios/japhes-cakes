import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-meta"
import { requireJsonRequest, noStoreJson } from "@/lib/request-security"

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  const contentTypeError = requireJsonRequest(request)
  if (contentTypeError) return contentTypeError

  const ip = getClientIp(request)

  try {
    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!email || !password) {
      return noStoreJson({ ok: false, message: "Email and password are required." }, { status: 400 })
    }

    const attemptKey = `admin-login:${ip}:${email}`
    const attempt = checkRateLimit(attemptKey, MAX_FAILED_ATTEMPTS, LOCKOUT_WINDOW_MS)
    if (!attempt.allowed) {
      return noStoreJson(
        {
          ok: false,
          message: "Too many failed login attempts. Please wait before trying again.",
          retryAfterMs: attempt.retryAfterMs,
        },
        { status: 429 }
      )
    }

    const pendingCookies: Array<{ name: string; value: string; options?: CookieOptions }> = []
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.headers.get("cookie")
              ?.split(/;\s*/)
              .filter(Boolean)
              .map((entry) => {
                const [name, ...rest] = entry.split("=")
                return { name, value: rest.join("=") }
              }) || []
          },
          setAll(newCookies) {
            newCookies.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options: options as CookieOptions })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return noStoreJson({ ok: false, message: "Authentication failed." }, { status: 401 })
    }

    const response = noStoreJson({ ok: true })
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  } catch {
    return noStoreJson({ ok: false, message: "Invalid login request." }, { status: 400 })
  }
}
