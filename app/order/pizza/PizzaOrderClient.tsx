"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import { DeliveryZone } from "@/types/types"

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

export default function PizzaOrderClient({ zones }: { zones: DeliveryZone[] }) {
    return <PizzaOrderForm zones={zones} />
}
