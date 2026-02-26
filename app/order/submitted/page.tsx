import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { createServiceSupabaseClient } from "@/lib/supabase-service"
import { notFound } from "next/navigation"
import { formatFriendlyId } from "@/lib/order-helpers"
import { buildReorderHref } from "@/lib/reorder"

const OrderSubmitted = dynamic(() => import("@/components/OrderSubmitted"))

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}): Promise<Metadata> {
  const { id } = await searchParams
  if (!id) return { title: "Receipt" }

  try {
    const supabase = createServiceSupabaseClient()
    const { data: order } = await supabase
      .from("orders")
      .select("id, friendly_id, created_at, order_type")
      .eq("id", id)
      .maybeSingle()

    const orderRef = order
      ? formatFriendlyId(order as { id: string; created_at: string | Date; order_type: string; friendly_id?: string | null })
      : id.slice(0, 8).toUpperCase()

    return { title: `Receipt-${orderRef}` }
  } catch {
    return { title: `Receipt-${id.slice(0, 8).toUpperCase()}` }
  }
}

export default async function OrderSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const supabase = createServiceSupabaseClient()
  const enableReorder = ["1", "true", "yes", "on"].includes((process.env.ENABLE_REORDER || "").toLowerCase())

  if (!id) return notFound()

  // Fetch full order details
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, friendly_id, created_at, order_type, fulfilment, customer_name, phone, mpesa_phone, delivery_fee, delivery_window, total_amount, payment_status, payment_method, payment_plan, payment_amount_paid, payment_amount_due, mpesa_transaction_id, order_items(item_name, quantity, notes), delivery_zones(name)"
    )
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
      enableReorder={enableReorder}
      reorderHref={enableReorder ? buildReorderHref(order as any) : null}
    />
  )
}
