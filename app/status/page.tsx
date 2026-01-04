import { createServerSupabaseClient } from "@/lib/supabase-server"
import dynamic from "next/dynamic"
import { OrderStatusSearch } from "@/components/order-status-search"
import OrderStatusTimeline from "@/components/OrderStatusTimeline"
import { OrderPaymentStatusCard } from "@/components/OrderPaymentStatusCard"
import { formatFriendlyId, getDeliveryEstimate } from "@/lib/order-helpers"
import { Package, Clock, MapPin } from "lucide-react"

export default async function OrderStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; phone?: string }>
}) {
  const { id, phone } = await searchParams
  const supabase = await createServerSupabaseClient()

  let order = null
  let error = null

  if (id && phone) {
    // Attempt 1: Try Direct UUID Match (legacy/backup)
    const { data: directData, error: directError } = await supabase
      .from("orders")
      .select("*, order_items(*), delivery_zones(name)")
      .eq("id", id)
      .eq("phone", phone)
      .single()

    if (!directError && directData) {
      order = directData
    } else {
      // Attempt 2: Friendly ID Lookup via Phone
      // If direct match failed, it might be a Friendly ID.
      // We'll fetch the last 5 orders for this phone and check if any generate this Friendly ID.
      const { data: phoneOrders, error: phoneError } = await supabase
        .from("orders")
        .select("*, order_items(*), delivery_zones(name)")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!phoneError && phoneOrders) {
        // Find the matching order by generating Friendly ID for each candidate
        const matchedOrder = phoneOrders.find(o => formatFriendlyId(o) === id)
        if (matchedOrder) {
          order = matchedOrder
        }
      }
    }

    if (!order) {
      error = "Order not found. Please check your ID and phone number."
    }
  }

  const isDelivery = order?.fulfilment === "delivery"
  const locationLabel = isDelivery ? "Delivery Location" : "Pickup Branch"
  const locationValue = isDelivery
    ? (order?.delivery_zones?.name || "Nairobi Region")
    : "Thika Branch"

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-serif font-bold text-gray-900">Track Your Order</h2>
        <p className="text-muted-foreground">Enter your details to see real-time updates.</p>
      </div>

      {!order && <OrderStatusSearch initialId={id} initialPhone={phone} error={error} />}

      {order && (
        <div className="space-y-8">
          {/* Status Header */}
          <div className="bg-white border rounded-3xl shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 border-b pb-6">
              <div className="text-center md:text-left">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Order Number</p>
                <p className="text-2xl font-mono font-bold text-gray-900 mt-1">{formatFriendlyId(order)}</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                  {isDelivery ? "Estimated Delivery" : "Estimated Pickup"}
                </p>
                <p className="text-xl font-bold text-rose-600 mt-1">{getDeliveryEstimate(order)}</p>
              </div>
            </div>

            {/* Timeline */}
            <OrderStatusTimeline status={order.status} orderType={order.order_type} fulfilment={order.fulfilment} />
          </div>

          {/* Payment Status */}
          <div>
            <OrderPaymentStatusCard
              paymentStatus={order.payment_status}
              paymentMethod={order.payment_method}
              fulfilment={order.fulfilment}
              mpesaTransactionId={order.mpesa_transaction_id}
              totalAmount={order.total_amount || 0}
            />
          </div>

          {/* Order Details Card */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Items */}
            <div className="bg-white border rounded-3xl shadow-sm p-6">
              <h3 className="flex items-center gap-2 font-bold text-lg mb-4 text-gray-800">
                <Package className="w-5 h-5 text-gray-500" /> Order Details
              </h3>
              <div className="space-y-4">
                {order.order_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <div>
                      <p className="font-semibold text-gray-900">{item.item_name}</p>
                      {item.quantity && <p className="text-sm text-gray-500">Qty: {item.quantity}</p>}
                      {item.notes && <p className="text-xs text-gray-400 mt-1 italic">"{item.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <span className="font-bold text-gray-600">Total Paid</span>
                <span className="font-bold text-xl text-gray-900">
                  {(order.total_amount || 0).toLocaleString()} KES
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="bg-white border rounded-3xl shadow-sm p-6 space-y-6">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-lg mb-2 text-gray-800">
                  <Clock className="w-5 h-5 text-gray-500" /> Order Time
                </h3>
                <p className="text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-bold text-lg mb-2 text-gray-800">
                  <MapPin className="w-5 h-5 text-gray-500" /> {locationLabel}
                </h3>
                <p className="text-gray-900 font-medium">{locationValue}</p>
                {order.delivery_window && (
                  <p className="text-sm text-gray-500 mt-1">
                    {isDelivery ? "Window: " : "Time: "}{order.delivery_window}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
