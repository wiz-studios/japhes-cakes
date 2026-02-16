import { NextResponse } from "next/server"

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_FROM",
]

export async function GET(request: Request) {
  const token = request.headers.get("x-admin-health-token")
  const expected = process.env.ADMIN_HEALTH_TOKEN

  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  const checks = REQUIRED_KEYS.map((key) => ({ key, present: Boolean(process.env[key]) }))
  return NextResponse.json({ ok: true, checks })
}
