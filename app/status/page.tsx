import { createServerSupabaseClient } from "@/lib/supabase-server"
import dynamic from "next/dynamic"
import { OrderStatusSearch } from "@/components/order-status-search"
import OrderStatusTimeline from "@/components/OrderStatusTimeline"
import { OrderPaymentStatusCard } from "@/components/OrderPaymentStatusCard"
import { formatFriendlyId, getDeliveryEstimate } from "@/lib/order-helpers"
import { Package, Clock } from "lucide-react"

export default async function OrderStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; phone?: string }>
}) {
  const { id, phone } = await searchParams
  const supabase = await createServerSupabaseClient()

  let order = null
  let error = null

  const trimmedId = id?.trim()
  const trimmedPhone = phone?.trim()
  const normalizedId = trimmedId ? trimmedId.toUpperCase() : undefined
  const isUuid = !!trimmedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmedId)

  if (trimmedId || trimmedPhone) {
    if (trimmedId) {
      let query = supabase
        .from("orders")
        .select("*, order_items(*), delivery_zones(name)")

      if (isUuid) {
        query = query.or(`id.eq.${trimmedId},friendly_id.eq.${normalizedId}`)
      } else {
        query = query.eq("friendly_id", normalizedId)
      }

      if (trimmedPhone) {
        query = query.eq("phone", trimmedPhone)
      }

      const { data: directData } = await query.maybeSingle()

      if (directData) {
        order = directData
      }
    }

    if (!order && trimmedPhone && !trimmedId) {
      const { data: phoneOrders, error: phoneError } = await supabase
        .from("orders")
        .select("*, order_items(*), delivery_zones(name)")
        .eq("phone", trimmedPhone)
        .order("created_at", { ascending: false })
        .limit(1)

      if (!phoneError && phoneOrders && phoneOrders.length > 0) {
        order = phoneOrders[0]
      }
    }

    if (!order && trimmedPhone && trimmedId) {
      const { data: phoneOrders, error: phoneError } = await supabase
        .from("orders")
        .select("*, order_items(*), delivery_zones(name)")
        .eq("phone", trimmedPhone)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!phoneError && phoneOrders) {
        const matchedOrder = phoneOrders.find(o => formatFriendlyId(o) === normalizedId)
        if (matchedOrder) {
          order = matchedOrder
        }
      }
    }

    if (!order) {
      error = trimmedId && trimmedPhone
        ? "Order not found. Please check your order number and phone number."
        : trimmedId
          ? "Order not found. Please check your order number."
          : "Order not found. Please check your phone number."
    }
  }

  const isDelivery = order?.fulfilment === "delivery"
  const locationLabel = isDelivery ? "Delivery Location" : "Pickup Branch"
  const locationValue = isDelivery
    ? (order?.delivery_zones?.name || "Nairobi Region")
    : "Thika Branch"
  const statusLabel = order?.status ? order.status.replace(/_/g, " ") : ""
  const statusToneMap: Record<string, string> = {
    order_received: "bg-amber-100 text-amber-700 border-amber-200",
    ready_for_pickup: "bg-emerald-100 text-emerald-700 border-emerald-200",
    delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    collected: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  }
  const statusTone = order ? statusToneMap[order.status] || "bg-slate-100 text-slate-700 border-slate-200" : ""

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#f6f2f7_0%,#eef1f8_55%,#eaeef7_100%)] relative overflow-hidden">
      <div className="absolute inset-0 hero-grain pointer-events-none" />
      <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(216,47,125,0.2),transparent_65%)] blur-3xl" />
      <div className="absolute -bottom-40 -left-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(58,78,216,0.22),transparent_65%)] blur-3xl" />
      <div className="relative space-y-10 max-w-[1400px] xl:max-w-[1500px] mx-auto px-4 py-12">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Live Status
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-semibold text-slate-900">Track Your Order</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Enter your order number or phone and see every update in real time.
          </p>
        </div>

        {!order && <OrderStatusSearch initialId={id} initialPhone={phone} error={error} />}

        {order && (
          <div className="space-y-8">
            <div className="lux-card p-7 md:p-9">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Order Number</p>
                  <p className="text-2xl md:text-3xl font-mono font-semibold text-slate-900 mt-2 break-all">
                    {formatFriendlyId(order)}
                  </p>
                </div>
                <span className={`w-fit rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${statusTone}`}>
                  {statusLabel}
                </span>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Fulfilment</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{isDelivery ? "Delivery" : "Pickup"}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    {isDelivery ? "Estimated Delivery" : "Estimated Pickup"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-rose-600 leading-snug">{getDeliveryEstimate(order)}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4 md:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{locationLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{locationValue}</p>
                  {order.delivery_window && (
                    <p className="text-xs text-slate-500 mt-1">
                      {isDelivery ? "Window: " : "Time: "}
                      {order.delivery_window}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Order Snapshot</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Placed</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Total</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {(order.total_amount || 0).toLocaleString()} KES
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Items</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{order.order_items?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lux-card p-7 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Progress</p>
                  <h3 className="text-lg font-semibold text-slate-900">Order Timeline</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-4 w-4" /> Updated live
                </div>
              </div>
              <OrderStatusTimeline status={order.status} orderType={order.order_type} fulfilment={order.fulfilment} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="lux-card p-7 md:p-8">
                <h3 className="flex items-center gap-2 font-semibold text-lg mb-4 text-slate-800 font-serif">
                  <Package className="w-5 h-5 text-slate-500" /> Order Details
                </h3>
                <div className="space-y-4">
                  {order.order_items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start border-b border-white/70 last:border-0 pb-3 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-900">{item.item_name}</p>
                        {item.quantity && <p className="text-sm text-slate-500">Qty: {item.quantity}</p>}
                        {item.notes && <p className="text-xs text-slate-400 mt-1 italic">"{item.notes}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/70 flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Order Total</span>
                  <span className="font-bold text-xl text-slate-900">
                    {(order.total_amount || 0).toLocaleString()} KES
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <OrderPaymentStatusCard
                  paymentStatus={order.payment_status}
                  paymentMethod={order.payment_method}
                  fulfilment={order.fulfilment}
                  mpesaTransactionId={order.mpesa_transaction_id}
                  totalAmount={order.total_amount || 0}
                  amountPaid={order.payment_amount_paid || 0}
                  amountDue={order.payment_amount_due || 0}
                />
                <div className="lux-card p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Need Help?</p>
                  <p className="mt-2 text-sm text-slate-600">
                    If anything looks off, call or WhatsApp our team and we will fix it quickly.
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-900">+254 700 000 000</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
