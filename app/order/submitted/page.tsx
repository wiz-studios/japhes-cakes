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

  const { data: paymentAttempts } = await supabase
    .from("payment_attempts")
    .select("id, mpesa_receipt, amount, result_code, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true })

  return (
    <OrderSubmitted
      order={order}
      paymentAttempts={paymentAttempts || []}
      isSandbox={process.env.PAYMENTS_ENV === "sandbox"}
    />
  )
}
