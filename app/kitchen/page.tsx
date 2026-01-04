"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { KitchenOrderCard } from "@/components/KitchenOrderCard"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, RefreshCw } from "lucide-react"

export default function KitchenPage() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const supabase = createClient()

    const fetchOrders = async () => {
        // Kitchen sees active orders only
        const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .in("status", ["order_received", "in_kitchen"])
            .order("created_at", { ascending: true })

        if (!error && data) {
            setOrders(data)
            setLastUpdated(new Date())
        }
        setLoading(false)
    }

    // Poll every 15s to keep kitchen screen fresh
    useEffect(() => {
        fetchOrders()
        const interval = setInterval(fetchOrders, 15000)
        return () => clearInterval(interval)
    }, [])

    // Filter into lists
    const newOrders = orders.filter(o => o.status === "order_received")
    const inKitchenOrders = orders.filter(o => o.status === "in_kitchen")

    if (loading) return <div className="p-8 text-2xl font-bold text-gray-500 animate-pulse">Loading Kitchen Display...</div>

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">KITCHEN DISPLAY</h1>
                    <Badge variant="outline" className="text-xs font-mono">
                        Updated: {lastUpdated.toLocaleTimeString()}
                    </Badge>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-medium text-emerald-700">Live Connection</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* COLUMN 1: NEW ORDERS */}
                <section className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 min-h-[600px]">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                            ⚠️ New Orders
                            <Badge className="bg-gray-800 text-white ml-2 text-lg h-7 px-3">{newOrders.length}</Badge>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {newOrders.length === 0 && (
                            <div className="text-center py-12 text-gray-400 italic">No new orders</div>
                        )}
                        {newOrders.map(order => (
                            <KitchenOrderCard key={order.id} order={order} />
                        ))}
                    </div>
                </section>

                {/* COLUMN 2: IN PROGRESS */}
                <section className="bg-blue-50/50 rounded-2xl border-2 border-blue-100 p-6 min-h-[600px]">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-200">
                        <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                            🔥 Cooking / Preparing
                            <Badge className="bg-blue-600 text-white ml-2 text-lg h-7 px-3">{inKitchenOrders.length}</Badge>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {inKitchenOrders.length === 0 && (
                            <div className="text-center py-12 text-blue-300 italic">Kitchen is clear</div>
                        )}
                        {inKitchenOrders.map(order => (
                            <KitchenOrderCard key={order.id} order={order} />
                        ))}
                    </div>
                </section>

            </div>
        </div>
    )
}
