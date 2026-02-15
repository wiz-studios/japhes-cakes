import { createServerSupabaseClient } from "@/lib/supabase-server"
import { normalizeStoreSettings } from "@/lib/store-settings"
import PizzaOrderClient from "./PizzaOrderClient"

export default async function PizzaOrderPage() {
  const supabase = await createServerSupabaseClient()
  const [{ data: zones }, { data: settingsRow }] = await Promise.all([
    supabase.from("delivery_zones").select("*").eq("allows_pizza", true),
    supabase
      .from("store_settings")
      .select("busy_mode_enabled, busy_mode_action, busy_mode_extra_minutes, busy_mode_message")
      .eq("id", true)
      .maybeSingle(),
  ])

  return <PizzaOrderClient zones={zones || []} storeSettings={normalizeStoreSettings(settingsRow)} />
}
