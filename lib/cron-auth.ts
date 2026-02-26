import { timingSafeEqual } from "node:crypto"

type CronAuthResult = {
  ok: boolean
  reason?: string
}

function safeCompare(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function extractProvidedSecret(request: Request) {
  const headerSecret = request.headers.get("x-cron-secret")?.trim()
  if (headerSecret) return headerSecret

  const authHeader = request.headers.get("authorization")?.trim()
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim()
    if (token) return token
  }

  const querySecret = new URL(request.url).searchParams.get("cron_secret")?.trim()
  if (querySecret) return querySecret

  return ""
}

export function verifyCronRequest(
  request: Request,
  options: { failClosedInProduction?: boolean } = {}
): CronAuthResult {
  const expected = process.env.CRON_SECRET?.trim()
  const failClosedInProduction = options.failClosedInProduction !== false

  if (!expected) {
    if (failClosedInProduction && process.env.NODE_ENV === "production") {
      return { ok: false, reason: "Missing CRON_SECRET in production" }
    }
    return { ok: true, reason: "CRON_SECRET not configured" }
  }

  const provided = extractProvidedSecret(request)
  if (!provided) return { ok: false, reason: "Missing cron secret" }
  if (!safeCompare(provided, expected)) return { ok: false, reason: "Invalid cron secret" }

  return { ok: true }
}

