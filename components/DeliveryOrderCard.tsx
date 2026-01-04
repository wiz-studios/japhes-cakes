"use client"

import { formatDistanceToNow } from "date-fns"
import { MapPin, Phone, MessageSquare, AlertTriangle, CheckCircle2, Bike, XCircle, Banknote, PackageCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { updateOrderStatus, completeDelivery } from "@/app/actions/orders" // We will add completeDelivery
import { useState } from "react"
import type { Order } from "@/lib/types/payment"

interface DeliveryOrderCardProps {
    order: Order
}

export function DeliveryOrderCard({ order }: DeliveryOrderCardProps) {
    const [loading, setLoading] = useState(false)

    // Handlers
    const handleStartDelivery = async () => {
        if (!confirm("Start delivery for this order?")) return
        setLoading(true)
        try {
            const res = await updateOrderStatus(order.id, "out_for_delivery")
            if (!res.success) alert(res.error)
        } catch (e) { console.error(e); alert("Failed to start delivery") }
        finally { setLoading(false) }
    }

    const handleCompleteDelivery = async () => {
        const isCash = order.payment_method === "cash"
        const confirmMsg = isCash
            ? `CONFIRM CASH COLLECTION:\n\nHave you received KES ${order.total_amount?.toLocaleString()}?`
            : "Confirm that order has been delivered?"

        if (!confirm(confirmMsg)) return

        setLoading(true)
        try {
            // New action for atomic delivery + payment
            const res = await completeDelivery(order.id, isCash)
            if (!res.success) alert(res.error)
        } catch (e) { console.error(e); alert("Failed to complete delivery") }
        finally { setLoading(false) }
    }

    // Status Colors
    const isReady = order.status === "ready_for_pickup" // In delivery context this means "Ready for Dispatch"
    const isOut = order.status === "out_for_delivery"

    return (
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-600 border-y border-r border-gray-200 overflow-hidden">
            <div className="p-5 space-y-4">

                {/* header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-2xl font-black text-gray-900 tracking-tight">
                                #{order.friendly_id || order.id.slice(0, 5).toUpperCase()}
                            </span>
                            {isOut && <Badge className="bg-blue-600 hover:bg-blue-700 animate-pulse">ON THE WAY</Badge>}
                            {isReady && <Badge variant="outline" className="bg-gray-100 text-gray-700">READY</Badge>}
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                            {formatDistanceToNow(new Date(order.created_at || new Date()))} ago
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge variant="outline" className="mb-1 text-xs">
                            {order.order_type === 'cake' ? "CAKE" : "PIZZA"}
                        </Badge>
                    </div>
                </div>

                {/* Customer & Location */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                            <div className="font-bold text-gray-900 leading-tight">
                                {order.delivery_zones?.name || "Delivery Zone"}
                            </div>
                            <div className="text-xs text-gray-500 uppercase font-semibold mt-1">
                                {order.fulfilment}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <a href={`tel:${order.phone}`} className="font-mono font-bold text-blue-600 underline">
                            {order.phone}
                        </a>
                    </div>
                    <div className="pl-8 text-sm text-gray-700 font-medium">
                        {order.customer_name}
                    </div>
                </div>

                {/* Payment Block (Crucial) */}
                <div className={`p-4 rounded-lg border-2 ${order.payment_method === 'cash' && order.payment_status !== 'paid'
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200"
                    }`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {order.payment_method === 'cash' ? (
                                <Banknote className="h-5 w-5 text-amber-700" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                            )}
                            <span className={`font-bold uppercase ${order.payment_method === 'cash' ? "text-amber-900" : "text-emerald-900"
                                }`}>
                                {order.payment_method === 'cash' ? "Collect Cash" : "Paid (M-Pesa)"}
                            </span>
                        </div>
                        <div className="text-xl font-black text-gray-900">
                            {order.total_amount?.toLocaleString()} KES
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-2">
                    {isReady && (
                        <Button
                            onClick={handleStartDelivery}
                            disabled={loading}
                            className="w-full h-14 text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-md"
                        >
                            {loading ? "Starting..." : (
                                <><Bike className="mr-2 h-6 w-6" /> START DELIVERY</>
                            )}
                        </Button>
                    )}

                    {isOut && (
                        <div className="grid grid-cols-1 gap-3">
                            <Button
                                onClick={handleCompleteDelivery}
                                disabled={loading}
                                className={`w-full h-14 text-lg font-black shadow-md ${order.payment_method === 'cash'
                                    ? "bg-amber-500 hover:bg-amber-600 text-black"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                            >
                                {loading ? "Updating..." : (
                                    <>
                                        {order.payment_method === 'cash' ? (
                                            <><Banknote className="mr-2 h-6 w-6" /> COLLECT & DELIVER</>
                                        ) : (
                                            <><PackageCheck className="mr-2 h-6 w-6" /> CONFIRM DELIVERY</>
                                        )}
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
