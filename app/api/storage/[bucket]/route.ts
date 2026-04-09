import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALLOWED_BUCKETS = new Set(["cake-designs", "school-gallery"])

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET(
  request: Request,
  context: { params: Promise<{ bucket: string }> }
) {
  const { bucket } = await context.params
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ ok: false, message: "Unsupported bucket." }, { status: 404 })
  }

  const path = new URL(request.url).searchParams.get("path")?.trim()
  if (!path) {
    return NextResponse.json({ ok: false, message: "Missing file path." }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Storage service unavailable." }, { status: 503 })
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, message: "File unavailable." }, { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl, 307)
}
