import { createServiceSupabaseClient } from "@/lib/supabase-service"
import { OrderStatusSearch } from "@/components/order-status-search"
import OrderStatusTimeline from "@/components/OrderStatusTimeline"
import { StatusPaymentPanel } from "@/components/status-payment-panel"
import { formatFriendlyId, getDeliveryEstimate } from "@/lib/order-helpers"
import { buildReorderHref } from "@/lib/reorder"
import { normalizeKenyaPhone } from "@/lib/phone"
import { formatDateTimeNairobi } from "@/lib/time"
import { Clock } from "lucide-react"
import Link from "next/link"

const ORDER_STATUS_SELECT =
  "id, friendly_id, created_at, customer_name, order_type, fulfilment, status, phone, mpesa_phone, total_amount, delivery_fee, delivery_zone_id, preferred_date, delivery_window, payment_status, payment_method, payment_plan, payment_amount_paid, payment_amount_due, mpesa_checkout_request_id, mpesa_transaction_id, order_items(item_name, quantity, notes), delivery_zones(name)"

const ENABLE_REORDER = ["1", "true", "yes", "on"].includes((process.env.ENABLE_REORDER || "").toLowerCase())

export default async function OrderStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; phone?: string }>
}) {
  const { id, phone } = await searchParams
  const supabase = createServiceSupabaseClient()

  let order = null
  let error = null

  const trimmedId = id?.trim()
  const trimmedPhone = phone?.trim()
  const normalizedPhone = trimmedPhone ? normalizeKenyaPhone(trimmedPhone) : undefined
  const normalizedId = trimmedId ? trimmedId.toUpperCase() : undefined
  const isUuid = !!trimmedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmedId)

  if (trimmedId || normalizedPhone) {
    // Never allow direct UUID lookup without a phone match.
    // This prevents order enumeration by leaked/internal IDs.
    if (isUuid && !normalizedPhone) {
      error = "Please enter your phone number together with the order number."
    } else if (trimmedId) {
      let query = supabase
        .from("orders")
        .select(ORDER_STATUS_SELECT)

      if (isUuid) {
        query = query.or(`id.eq.${trimmedId},friendly_id.eq.${normalizedId}`)
      } else {
        query = query.eq("friendly_id", normalizedId)
      }

      const { data: directData } = await query.maybeSingle()

      if (directData) {
        const matchesPhone =
          !normalizedPhone ||
          normalizeKenyaPhone(directData.phone || "") === normalizedPhone ||
          normalizeKenyaPhone(directData.mpesa_phone || "") === normalizedPhone

        if (!matchesPhone) {
          order = null
        } else {
          order = directData
        }
      }
    }

    if (!order && normalizedPhone && !trimmedId && !error) {
      const { data: phoneOrders, error: phoneError } = await supabase
        .from("orders")
        .select(ORDER_STATUS_SELECT)
        .or(`phone.eq.${normalizedPhone},mpesa_phone.eq.${normalizedPhone}`)
        .order("created_at", { ascending: false })
        .limit(1)

      if (!phoneError && phoneOrders && phoneOrders.length > 0) {
        order = phoneOrders[0]
      }
    }

    if (!order && normalizedPhone && trimmedId && !error) {
      const { data: phoneOrders, error: phoneError } = await supabase
        .from("orders")
        .select(ORDER_STATUS_SELECT)
        .or(`phone.eq.${normalizedPhone},mpesa_phone.eq.${normalizedPhone}`)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!phoneError && phoneOrders) {
        const matchedOrder = phoneOrders.find(o => formatFriendlyId(o) === normalizedId)
        if (matchedOrder) {
          order = matchedOrder
        }
      }
    }

    if (!order && !error) {
      error = trimmedId && normalizedPhone
        ? "Order not found. Please check your order number and phone number."
        : trimmedId
          ? "Order not found. Please check your order number."
          : "Order not found. Please check your phone number."
    }
  }

  const isDelivery = order?.fulfilment === "delivery"
  const deliveryZoneName = Array.isArray((order as any)?.delivery_zones)
    ? (order as any)?.delivery_zones?.[0]?.name
    : (order as any)?.delivery_zones?.name
  const locationLabel = isDelivery ? "Delivery Location" : "Pickup Branch"
  const locationValue = isDelivery
    ? (deliveryZoneName || "Nairobi Region")
    : "Thika Branch"
  const statusLabel = order?.status ? order.status.replace(/_/g, " ") : ""
  const statusToneMap: Record<string, string> = {
    order_received: "bg-amber-50 text-amber-700 border-amber-200",
    ready_for_pickup: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    collected: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  }
  const statusTone = order ? statusToneMap[order.status] || "bg-slate-50 text-slate-700 border-slate-200" : ""
  const cardClass =
    "rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-20px_rgba(15,23,42,0.25)]"
  const metaLabelClass =
    "text-[10px] uppercase tracking-[0.16em] leading-tight text-slate-400 sm:text-[11px] sm:tracking-[0.24em]"
  const reorderHref = order && ENABLE_REORDER ? buildReorderHref(order as any) : null

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="space-y-8 w-full max-w-6xl xl:max-w-7xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-12">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-semibold">Order Tracking</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-900">Track Your Order</h2>
          <p className="text-slate-500 max-w-3xl">
            Enter your order number or phone to see production, payment, and delivery updates.
          </p>
        </div>

        {!order && <OrderStatusSearch initialId={id} initialPhone={normalizedPhone || ""} error={error} />}

        {order && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className={`${cardClass} p-6 md:p-8`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400 font-semibold">Order Number</p>
                  <p className="text-2xl md:text-3xl font-mono font-semibold text-slate-900 mt-2 break-words">
                    {formatFriendlyId(order)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400 font-semibold">Status</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400 font-semibold">
                      {isDelivery ? "ETA" : "Pickup ETA"}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{getDeliveryEstimate(order)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className={metaLabelClass}>Fulfilment</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 break-words">{isDelivery ? "Delivery" : "Pickup"}</p>
                </div>
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className={metaLabelClass}>{locationLabel}</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 break-words">{locationValue}</p>
                  {order.delivery_window && (
                    <p className="text-xs text-slate-500 mt-1">
                      {isDelivery ? "Window: " : "Time: "}
                      {order.delivery_window}
                    </p>
                  )}
                </div>
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className={metaLabelClass}>Total</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {(order.total_amount || 0).toLocaleString()} KES
                  </p>
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-6`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Order Timeline</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-4 w-4" /> Updated live
                </div>
              </div>
              <div className="mt-6">
                <OrderStatusTimeline status={order.status} orderType={order.order_type} fulfilment={order.fulfilment} />
              </div>
            </div>

            <StatusPaymentPanel
              orderId={order.id}
              fulfilment={order.fulfilment}
              initialPhone={order.mpesa_phone || order.phone || ""}
              initialState={{
                orderStatus: order.status,
                paymentStatus: order.payment_status || "pending",
                paymentMethod: order.payment_method || "mpesa",
                totalAmount: Number(order.total_amount || 0),
                amountPaid: Number(order.payment_amount_paid || 0),
                balanceDue: Number(order.payment_amount_due || 0),
                mpesaTransactionId: order.mpesa_transaction_id || null,
                lastCheckoutRequestId: order.mpesa_checkout_request_id || null,
              }}
            />

            {reorderHref && (
              <div className={`${cardClass} p-5`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">Need the same order?</p>
                    <p className="text-sm text-slate-600 mt-1">Start with your previous item details prefilled.</p>
                  </div>
                  <Link
                    href={reorderHref}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Reorder
                  </Link>
                </div>
              </div>
            )}

            <div className={`${cardClass} p-6`}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-4">Items</h3>
              <div className="divide-y divide-slate-100">
                {(order.order_items || []).map((item: any, idx: number) => (
                  <div key={idx} className="py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.item_name}</p>
                      {item.notes && <p className="text-xs text-slate-500 mt-1">{item.notes}</p>}
                    </div>
                    {item.quantity && (
                      <span className="text-xs font-semibold text-slate-500">Qty: {item.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className={`${cardClass} p-6`}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-4">Order Meta</h3>
                <div className="grid gap-4 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Placed</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDateTimeNairobi(order.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Items</p>
                    <p className="mt-1 font-semibold text-slate-900">{order.order_items?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className={`${cardClass} p-6`}>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Support</p>
                <p className="mt-2 text-sm text-slate-600">
                  Need adjustments? Contact our operations desk for immediate help.
                </p>
                <div className="mt-3 text-sm font-semibold text-slate-900">
                  <a href="tel:+254708244764" className="block hover:text-slate-900/90" aria-label="Call 0708244764">0708244764</a>
                  <a href="mailto:ericklangat716@gmail.com" className="block text-slate-600 font-normal break-all" aria-label="Email ericklangat716@gmail.com">ericklangat716@gmail.com</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
