import { createServerSupabaseClient } from "@/lib/supabase-server"
import { normalizeStoreSettings } from "@/lib/store-settings"
import { listDeliveryZonesCached } from "@/lib/delivery-zones-cache"
import PizzaOrderClient from "./PizzaOrderClient"

export default async function PizzaOrderPage() {
  const supabase = await createServerSupabaseClient()
  const [zones, { data: settingsRow }] = await Promise.all([
    listDeliveryZonesCached(supabase, "pizza"),
    supabase
      .from("store_settings")
      .select("busy_mode_enabled, busy_mode_action, busy_mode_extra_minutes, busy_mode_message")
      .eq("id", true)
      .maybeSingle(),
  ])

  return <PizzaOrderClient zones={zones || []} storeSettings={normalizeStoreSettings(settingsRow)} />
}
