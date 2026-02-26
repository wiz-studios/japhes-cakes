"use client"

import dynamic from "next/dynamic"
import type { StoreSettings } from "@/lib/store-settings"
import { OrderFormSkeleton } from "@/components/ui/app-skeleton"

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
        loading: () => <OrderFormSkeleton accentClass="bg-rose-300" />,
    }
)

export default function CakeOrderClient({ zones, storeSettings }: { zones: DeliveryZone[]; storeSettings: StoreSettings }) {
    return <CakeOrderForm zones={zones} storeSettings={storeSettings} />
}
