"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { DeliveryOrderCard } from "@/components/DeliveryOrderCard"
import { Badge } from "@/components/ui/badge"
import { Bike, CheckCircle2 } from "lucide-react"

export default function DeliveryDashboard() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const supabase = createClient()

    const fetchOrders = async () => {
        // FETCH STRATEGY: 
        // 1. Get all active delivery orders (ready or out)
        // 2. Filter strictly in JS to avoid complex RLS/Query issues for now
        //    (Ideally this is a view or strict query)

        const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*), delivery_zones(*)")
            .eq("fulfilment", "delivery") // STRICT: Delivery only
            .in("status", ["ready_for_pickup", "out_for_delivery"])
            .order("created_at", { ascending: true })

        if (!error && data) {
            // STRICT FILTERING (The "Order Eligibility Rules")
            const validOrders = data.filter(order => {
                // 1. If Cash -> Allowed
                if (order.payment_method === "cash") return true
                // 2. If M-Pesa -> Must be PAID
                if (order.payment_method === "mpesa" && order.payment_status === "paid") return true

                // Unpaid M-Pesa? INVISIBLE.
                return false
            })

            setOrders(validOrders)
            setLastUpdated(new Date())
        }
        setLoading(false)
    }

    // Poll every 15s
    useEffect(() => {
        fetchOrders()
        const interval = setInterval(fetchOrders, 15000)
        return () => clearInterval(interval)
    }, [])

    const readyOrders = orders.filter(o => o.status === "ready_for_pickup")
    const outOrders = orders.filter(o => o.status === "out_for_delivery")

    if (loading) return <div className="p-8 text-2xl font-bold text-gray-500 animate-pulse">Loading Delivery Manifest...</div>

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6">
            <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-lg">
                        <Bike className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">DELIVERY</h1>
                        <div className="text-xs font-mono text-gray-500 mt-1">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 text-sm font-bold">
                    <div className="flex flex-col items-center">
                        <span className="text-gray-500 text-xs">READY</span>
                        <span className="text-2xl">{readyOrders.length}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-blue-600 text-xs">ON ROAD</span>
                        <span className="text-2xl text-blue-600">{outOrders.length}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* OUT FOR DELIVERY (Priority) */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="animate-pulse h-3 w-3 rounded-full bg-blue-500"></span>
                        <h2 className="text-lg font-black text-blue-900 uppercase">On The Road</h2>
                    </div>
                    <div className="space-y-4">
                        {outOrders.length === 0 && (
                            <div className="bg-blue-50 rounded-xl p-8 text-center text-blue-300 font-bold border-2 border-dashed border-blue-100">
                                NO ACTIVE DELIVERIES
                            </div>
                        )}
                        {outOrders.map(order => (
                            <DeliveryOrderCard key={order.id} order={order} />
                        ))}
                    </div>
                </section>

                {/* READY FOR PICKUP */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                        <h2 className="text-lg font-black text-gray-700 uppercase">Ready at Shop</h2>
                    </div>
                    <div className="space-y-4">
                        {readyOrders.length === 0 && (
                            <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 font-bold border-2 border-dashed border-gray-200">
                                NO ORDERS WAITING
                            </div>
                        )}
                        {readyOrders.map(order => (
                            <DeliveryOrderCard key={order.id} order={order} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
