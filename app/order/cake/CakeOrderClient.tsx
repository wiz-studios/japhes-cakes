"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { DeliveryZone } from "@/types/types"

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

export default function CakeOrderClient({ zones }: { zones: DeliveryZone[] }) {
    return <CakeOrderForm zones={zones} />
}
