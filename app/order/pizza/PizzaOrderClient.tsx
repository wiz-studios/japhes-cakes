"use client"

import dynamic from "next/dynamic"
import type { StoreSettings } from "@/lib/store-settings"
import { OrderFormSkeleton } from "@/components/ui/app-skeleton"

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
        loading: () => <OrderFormSkeleton accentClass="bg-orange-300" />,
    }
)

export default function PizzaOrderClient({ zones, storeSettings }: { zones: DeliveryZone[]; storeSettings: StoreSettings }) {
    return <PizzaOrderForm zones={zones} storeSettings={storeSettings} />
}
