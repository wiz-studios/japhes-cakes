"use client"

import { Check, Circle, PackageCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type OrderStatusTimelineProps = {
    status: string
    orderType: "cake" | "pizza"
    fulfilment: "delivery" | "pickup" | string
}

const DELIVERY_STEPS = [
    { key: "order_received", label: "Confirmed", icon: Check },
    { key: "ready_for_pickup", label: "Ready", icon: PackageCheck },
    { key: "delivered", label: "Delivered", icon: Circle },
]

const PICKUP_STEPS = [
    { key: "order_received", label: "Confirmed", icon: Check },
    { key: "ready_for_pickup", label: "Ready", icon: PackageCheck },
    { key: "collected", label: "Collected", icon: Circle },
]

export default function OrderStatusTimeline({ status, orderType, fulfilment }: OrderStatusTimelineProps) {
    const isDelivery = fulfilment === "delivery"
    const STEPS = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS

    let currentStatusKey = status
    if (!isDelivery && status === "delivered") {
        currentStatusKey = "collected"
    }

    const currentStepIdx = STEPS.findIndex(s => s.key === currentStatusKey)
    const activeIdx = currentStepIdx === -1 ? 0 : currentStepIdx

    const isCake = orderType === "cake"
    const activeColor = isCake ? "bg-rose-600" : "bg-orange-600"
    const activeBorder = isCake ? "border-rose-600" : "border-orange-600"
    const inactiveBorder = "border-slate-200"

    return (
        <div className="w-full">
            <div className="relative">
                <div className="absolute left-6 right-6 top-5 h-px bg-slate-200" />
                <div className="flex items-start justify-between gap-4">
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < activeIdx
                        const isActive = idx === activeIdx
                        const Icon = step.icon
                        return (
                            <div key={step.key} className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                                <div
                                    className={cn(
                                        "h-10 w-10 rounded-full border-2 flex items-center justify-center bg-white relative z-10",
                                        isActive || isCompleted
                                            ? `${activeColor} ${activeBorder} text-white`
                                            : `bg-white ${inactiveBorder} text-slate-300`
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                                <span className={cn("text-[11px] font-semibold uppercase tracking-[0.18em] leading-tight", isActive ? "text-slate-900" : "text-slate-400")}>
                                    {step.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
