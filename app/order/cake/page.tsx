import { createServerSupabaseClient } from "@/lib/supabase-server"
import CakeOrderClient from "./CakeOrderClient"

export default async function CakeOrderPage() {
  const supabase = await createServerSupabaseClient()
  const { data: zones } = await supabase.from("delivery_zones").select("*").eq("allows_cake", true)

  return <CakeOrderClient zones={zones || []} />
}
