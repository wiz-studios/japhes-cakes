"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import type { StoreSettings } from "@/lib/store-settings"

type DeliveryZone = {
    id: string
    name: string
    delivery_fee: number
    allows_pizza: boolean
}

const PizzaOrderForm = dynamic(
    () => import("@/components/order/PizzaOrderForm").then(mod => mod.PizzaOrderForm),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-orange-600" />
            </div>
        ),
    }
)

export default function PizzaOrderClient({ zones, storeSettings }: { zones: DeliveryZone[]; storeSettings: StoreSettings }) {
    return <PizzaOrderForm zones={zones} storeSettings={storeSettings} />
}
