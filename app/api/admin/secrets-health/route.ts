import { timingSafeEqual } from "node:crypto"
import { noStoreJson } from "@/lib/request-security"

const CORE_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]

const OPTIONAL_GROUPS = [
  {
    name: "admin_payment_alert_whatsapp",
    keys: [
      "WHATSAPP_ALERT_ACCESS_TOKEN",
      "WHATSAPP_ALERT_PHONE_NUMBER_ID",
      "ADMIN_PAYMENT_ALERT_WHATSAPP_TO",
    ],
  },
  {
    name: "school_inquiry_email",
    keys: ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS", "EMAIL_FROM"],
  },
]

export async function GET(request: Request) {
  const token = request.headers.get("x-admin-health-token")
  const expected = process.env.ADMIN_HEALTH_TOKEN

  const providedBytes = Buffer.from(token || "")
  const expectedBytes = Buffer.from(expected || "")
  const authorized =
    providedBytes.length > 0 &&
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)

  if (!authorized) {
    return noStoreJson({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const checks = CORE_KEYS.map((key) => ({ key, present: Boolean(process.env[key]) }))
  const groups = OPTIONAL_GROUPS.map((group) => {
    const entries = group.keys.map((key) => ({ key, present: Boolean(process.env[key]) }))
    return {
      name: group.name,
      ready: entries.every((entry) => entry.present),
      checks: entries,
    }
  })

  return noStoreJson({ ok: true, checks, groups })
}
