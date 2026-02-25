import { createClient } from "@supabase/supabase-js"

const DEFAULT_TTL_SECONDS = 15 * 60
const MAX_KEY_LENGTH = 120

type IdempotencyRow = {
  status: string
  response_json: Record<string, unknown> | null
  expires_at: string
}

export type IdempotentRunResult<T extends Record<string, unknown>> =
  | { state: "fresh"; result: T }
  | { state: "replay"; result: T }
  | { state: "in_progress" }

function normalizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_KEY_LENGTH)
}

function getIdempotencyClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

async function readExistingRow(scope: string, idempotencyKey: string): Promise<IdempotencyRow | null> {
  const supabase = getIdempotencyClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("idempotency_keys")
    .select("status, response_json, expires_at")
    .eq("scope", scope)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle()

  if (error) return null
  return data as IdempotencyRow | null
}

async function clearExpiredRow(scope: string, idempotencyKey: string): Promise<void> {
  const supabase = getIdempotencyClient()
  if (!supabase) return

  await supabase
    .from("idempotency_keys")
    .delete()
    .eq("scope", scope)
    .eq("idempotency_key", idempotencyKey)
    .lt("expires_at", new Date().toISOString())
}

export async function runIdempotent<T extends Record<string, unknown>>(options: {
  scope: string
  idempotencyKey?: unknown
  ttlSeconds?: number
  run: () => Promise<T>
}): Promise<IdempotentRunResult<T>> {
  const key = normalizeIdempotencyKey(options.idempotencyKey)
  const ttlSeconds = Math.max(30, Number(options.ttlSeconds || DEFAULT_TTL_SECONDS))
  const supabase = getIdempotencyClient()

  if (!key || !supabase) {
    const result = await options.run()
    return { state: "fresh", result }
  }

  const now = Date.now()
  const expiresAt = new Date(now + ttlSeconds * 1000).toISOString()

  const { error: insertError } = await supabase
    .from("idempotency_keys")
    .insert({
      scope: options.scope,
      idempotency_key: key,
      status: "processing",
      expires_at: expiresAt,
      updated_at: new Date(now).toISOString(),
    })

  if (insertError?.code === "23505") {
    const existing = await readExistingRow(options.scope, key)

    if (existing) {
      const isExpired = new Date(existing.expires_at).getTime() <= Date.now()
      if (isExpired) {
        await clearExpiredRow(options.scope, key)
        const retryResult = await supabase
          .from("idempotency_keys")
          .select("id")
          .eq("scope", options.scope)
          .eq("idempotency_key", key)
          .maybeSingle()

        if (!retryResult.data) {
          return runIdempotent({
            ...options,
            // Avoid recursion loops if cleanup fails under concurrency.
            idempotencyKey: key,
          })
        }
      }

      if (existing.response_json) {
        return { state: "replay", result: existing.response_json as T }
      }
    }

    return { state: "in_progress" }
  }

  if (insertError) {
    const result = await options.run()
    return { state: "fresh", result }
  }

  try {
    const result = await options.run()

    await supabase
      .from("idempotency_keys")
      .update({
        status: (result as { success?: boolean }).success === false ? "failed" : "completed",
        response_json: result,
        updated_at: new Date().toISOString(),
      })
      .eq("scope", options.scope)
      .eq("idempotency_key", key)

    return { state: "fresh", result }
  } catch (error) {
    await supabase
      .from("idempotency_keys")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("scope", options.scope)
      .eq("idempotency_key", key)

    throw error
  }
}
