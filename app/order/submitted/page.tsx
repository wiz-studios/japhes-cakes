import dynamic from "next/dynamic"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"

const OrderSubmitted = dynamic(() => import("@/components/OrderSubmitted"))

export default async function OrderSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>
}) {
  const { id } = await searchParams
  const supabase = await createServerSupabaseClient()

  if (!id) return notFound()

  // Fetch full order details
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*), delivery_zones(name)")
    .eq("id", id)
    .single()

  if (error || !order) return notFound()

  return <OrderSubmitted order={order} isSandbox={process.env.PAYMENTS_ENV === "sandbox"} />
}
