export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  const fallback =
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-client-ip")

  return fallback?.trim() || "unknown"
}

export function getRequestId(request: Request): string {
  const explicit = request.headers.get("x-request-id")?.trim()
  if (explicit) return explicit.slice(0, 80)
  return crypto.randomUUID()
}

export function logWithRequestId(
  requestId: string,
  message: string,
  data?: Record<string, unknown>
) {
  if (data) {
    console.log(`[${requestId}] ${message}`, data)
    return
  }
  console.log(`[${requestId}] ${message}`)
}
