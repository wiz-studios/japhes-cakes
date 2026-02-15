"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import type { StoreSettings } from "@/lib/store-settings"

type DeliveryZone = {
    id: string
    name: string
    delivery_fee: number
    allows_cake: boolean
}

const CakeOrderForm = dynamic(
    () => import("@/components/order/CakeOrderForm").then(mod => mod.CakeOrderForm),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-rose-600" />
            </div>
        ),
    }
)

export default function CakeOrderClient({ zones, storeSettings }: { zones: DeliveryZone[]; storeSettings: StoreSettings }) {
    return <CakeOrderForm zones={zones} storeSettings={storeSettings} />
}
