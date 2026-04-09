import { getClientIp } from "@/lib/request-meta"
import { requireJsonRequest, noStoreJson } from "@/lib/request-security"

export async function POST(request: Request) {
  const contentTypeError = requireJsonRequest(request)
  if (contentTypeError) return contentTypeError

  try {
    const body = await request.json()
    const event = typeof body?.event === "string" ? body.event.slice(0, 80) : "unknown"
    const actor = typeof body?.actor === "string" ? body.actor.slice(0, 120) : "unknown"
    console.info("[admin-audit]", {
      event,
      actor,
      ip: getClientIp(request),
      at: new Date().toISOString(),
    })
    return noStoreJson({ ok: true })
  } catch {
    return noStoreJson({ ok: false }, { status: 400 })
  }
}
