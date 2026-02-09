"use client"

import { formatDistanceToNow } from "date-fns"
import { Clock, AlertTriangle, CheckCircle2, PlayCircle, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { updateOrderStatus } from "@/app/actions/orders"
import { useState } from "react"
import type { Order } from "@/lib/types/payment"

interface KitchenOrderCardProps {
    order: Order
}

export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
    const [loading, setLoading] = useState(false)

    // STRICT PAYMENT LOCK LOGIC
    const isUnpaidMpesaDelivery =
        order.fulfilment === "delivery" &&
        order.payment_method === "mpesa" &&
        !["paid", "deposit_paid"].includes(order.payment_status)

    const handleStatusUpdate = async (newStatus: string) => {
        if (loading) return

        // Client-side guard (redundant but good for UX)
        if (isUnpaidMpesaDelivery && ["in_kitchen", "getting_ready", "ready_for_pickup"].includes(newStatus)) {
            alert("STRICT LOCK: Cannot prepare unpaid M-Pesa Delivery orders.")
            return
        }

        setLoading(true)
        try {
            const res = await updateOrderStatus(order.id, newStatus)
            if (!res.success) {
                alert(res.error)
            }
        } catch (e) {
            console.error(e)
            alert("Failed to update order")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`
      relative overflow-hidden rounded-2xl border shadow-[0_18px_50px_-40px_rgba(15,20,40,0.5)] transition-all
      ${isUnpaidMpesaDelivery ? "border-red-200 bg-red-50/70" : "border-white/60 bg-white/90"}
    `}>
            {/* Strict Lock Overlay / Banner */}
            {isUnpaidMpesaDelivery && (
                <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 flex items-center justify-center gap-2">
                    <Ban className="h-3 w-3" />
                    UNPAID DELIVERY - DO NOT PREPARE
                </div>
            )}

            <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-lg font-bold text-gray-900">
                                #{order.friendly_id || order.id.slice(0, 6).toUpperCase()}
                            </span>
                            <Badge variant="outline" className={order.order_type === 'cake' ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"}>
                                {order.order_type === 'cake' ? "Cake" : "Pizza"}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(order.created_at))} ago
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="font-semibold text-gray-900">{order.customer_name.split(" ")[0]}</div>
                        <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">{order.fulfilment}</div>
                    </div>
                </div>

                {/* Note if exists */}
                {/* We can add general order notes if we had them, for now usually items have notes */}

                {/* Items List */}
                <div className="space-y-3 py-2">
                    {order.order_items?.map((item: any) => (
                        <div key={item.id} className="text-gray-900">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-lg min-w-[24px]">{item.quantity}x</span>
                                <div>
                                    <div className="text-lg leading-tight font-medium">
                                        {item.item_name}
                                    </div>
                                    {item.notes && (
                                        <div className="text-rose-600 bg-rose-50 px-2 py-1 rounded text-sm mt-1 inline-block font-medium">
                                            Note: {item.notes}
                                        </div>
                                    )}
                                    {/* Pizza Specific Details if stored explicitly or just in name */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-white/60 grid grid-cols-1 gap-2">
                    {order.status === "order_received" && (
                        <Button
                            onClick={() => handleStatusUpdate("in_kitchen")}
                            disabled={loading || isUnpaidMpesaDelivery}
                            className={`w-full h-12 text-lg font-bold ${isUnpaidMpesaDelivery ? "opacity-50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                        >
                            {loading ? "Updating..." : (
                                <>
                                    <PlayCircle className="mr-2 h-5 w-5" /> Start Preparing
                                </>
                            )}
                        </Button>
                    )}

                    {order.status === "in_kitchen" && (
                        <Button
                            onClick={() => handleStatusUpdate("ready_for_pickup")}
                            disabled={loading} // Usually paid by now, or we allowed manual override
                            className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700"
                        >
                            {loading ? "Updating..." : (
                                <>
                                    <CheckCircle2 className="mr-2 h-5 w-5" /> Mark Ready
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
