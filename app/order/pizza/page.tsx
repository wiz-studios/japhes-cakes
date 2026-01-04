import { createServerSupabaseClient } from "@/lib/supabase-server"
import PizzaOrderClient from "./PizzaOrderClient"

export default async function PizzaOrderPage() {
  const supabase = await createServerSupabaseClient()
  const { data: zones } = await supabase.from("delivery_zones").select("*").eq("allows_pizza", true)

  return <PizzaOrderClient zones={zones || []} />
}
