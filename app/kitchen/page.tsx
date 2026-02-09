"use client"

import { createClient } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { KitchenOrderCard } from "@/components/KitchenOrderCard"
import { Badge } from "@/components/ui/badge"

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
        <div className="min-h-screen bg-[linear-gradient(140deg,#f6f2f7_0%,#f0edf6_55%,#e9edf7_100%)] p-4 md:p-6">
            <header className="flex justify-between items-center mb-8 bg-white/90 p-4 rounded-2xl shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)] border border-white/60 backdrop-blur">
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
                <section className="bg-white/90 rounded-3xl border border-white/60 p-6 min-h-[600px] shadow-[0_20px_60px_-55px_rgba(15,20,40,0.5)]">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                            New Orders
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
                <section className="bg-white/90 rounded-3xl border border-white/60 p-6 min-h-[600px] shadow-[0_20px_60px_-55px_rgba(15,20,40,0.5)]">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-200">
                        <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                            Cooking / Preparing
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
