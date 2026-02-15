"use server"

import { createClient, type User } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { BusyModeAction } from "@/lib/store-settings"
import { normalizeStoreSettings } from "@/lib/store-settings"

function isAdminUser(user: User | null): boolean {
  if (!user) return false
  const role = user.user_metadata?.role as string | undefined
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (role === "admin") return true
  if (adminEmail && user.email?.toLowerCase() === adminEmail) return true
  return false
}

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { client: null, error: "Missing Supabase admin credentials." }
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }),
    error: null,
  }
}

export async function updateBusyModeSettings(input: {
  busyModeEnabled: boolean
  busyModeAction: BusyModeAction
  busyModeExtraMinutes: number
  busyModeMessage?: string
}) {
  const sessionClient = await createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!isAdminUser(user)) {
    return { success: false, error: "Unauthorized: Admin access required" }
  }

  const { client: supabase, error: clientError } = getAdminSupabase()
  if (!supabase) {
    return { success: false, error: clientError || "Failed to initialize Supabase." }
  }

  const action: BusyModeAction =
    input.busyModeAction === "increase_eta" ? "increase_eta" : "disable_orders"
  const extraMinutes = Number.isFinite(input.busyModeExtraMinutes)
    ? Math.min(Math.max(Math.round(input.busyModeExtraMinutes), 0), 180)
    : 20
  const message = (input.busyModeMessage || "").trim().slice(0, 180)

  const { error } = await supabase
    .from("store_settings")
    .upsert(
      {
        id: true,
        busy_mode_enabled: Boolean(input.busyModeEnabled),
        busy_mode_action: action,
        busy_mode_extra_minutes: extraMinutes,
        busy_mode_message: message || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/dashboard")
  revalidatePath("/order/cake")
  revalidatePath("/order/pizza")

  return {
    success: true,
    settings: normalizeStoreSettings({
      busy_mode_enabled: Boolean(input.busyModeEnabled),
      busy_mode_action: action,
      busy_mode_extra_minutes: extraMinutes,
      busy_mode_message: message || null,
    }),
  }
}
