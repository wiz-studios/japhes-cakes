import { NextResponse } from "next/server"
import { registerDarajaC2BUrls } from "@/lib/mpesa-daraja"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp, getRequestId } from "@/lib/request-meta"

type C2BRegisterBody = {
  shortcode?: string
  confirmationUrl?: string
  validationUrl?: string
  responseType?: "Completed" | "Cancelled"
}

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.MPESA_REGISTER_SECRET?.trim()
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production"
  }

  const explicitHeader =
    request.headers.get("x-register-secret") ||
    request.headers.get("x-webhook-secret") ||
    request.headers.get("x-callback-secret")

  if (explicitHeader?.trim() === configuredSecret) return true

  const authHeader = request.headers.get("authorization")?.trim()
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const bearer = authHeader.slice(7).trim()
    if (bearer === configuredSecret) return true
  }

  return false
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const ip = getClientIp(request)

  const limit = checkRateLimit(`c2b-register:${ip}`, 20, 60 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many register attempts", requestId }, { status: 429 })
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 })
  }

  try {
    let body: C2BRegisterBody = {}
    const rawBody = await request.text()
    if (rawBody.trim()) {
      body = JSON.parse(rawBody) as C2BRegisterBody
    }

    const response = await registerDarajaC2BUrls({
      shortcode: body.shortcode,
      confirmationUrl: body.confirmationUrl,
      validationUrl: body.validationUrl,
      responseType: body.responseType,
    })

    return NextResponse.json({
      ok: true,
      ...response,
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] [C2B-REGISTER] Error:`, error)
    return NextResponse.json({ error: error?.message || "Register failed", requestId }, { status: 500 })
  }
}
