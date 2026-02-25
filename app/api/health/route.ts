import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const deep = url.searchParams.get("deep")

  const payload: Record<string, unknown> = {
    ok: true,
    service: "japhes-api",
    now: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  }

  if (deep === "1" || deep === "true") {
    const supabase = getServiceSupabase()
    if (!supabase) {
      payload.ok = false
      payload.database = "missing-service-credentials"
      return NextResponse.json(payload, { status: 503 })
    }

    const started = Date.now()
    const { error } = await supabase.from("orders").select("id", { head: true, count: "exact" }).limit(1)
    payload.databaseLatencyMs = Date.now() - started

    if (error) {
      payload.ok = false
      payload.database = error.message
      return NextResponse.json(payload, { status: 503 })
    }

    payload.database = "ok"
  }

  return NextResponse.json(payload, { status: 200 })
}
