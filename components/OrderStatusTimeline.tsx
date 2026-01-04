"use client"

import { motion } from "framer-motion"
import { Check, Circle, ChefHat, Bike, PackageCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type OrderStatusTimelineProps = {
    status: string
    orderType: "cake" | "pizza"
    fulfilment: "delivery" | "pickup" | string
}

const DELIVERY_STEPS = [
    { key: "order_received", label: "Confirmed", icon: Check },
    { key: "in_kitchen", label: "Preparing", icon: ChefHat },
    { key: "ready_for_pickup", label: "Ready", icon: PackageCheck },
    { key: "out_for_delivery", label: "On the way", icon: Bike },
    { key: "delivered", label: "Delivered", icon: Circle },
]

const PICKUP_STEPS = [
    { key: "order_received", label: "Confirmed", icon: Check },
    { key: "in_kitchen", label: "Preparing", icon: ChefHat },
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
    const activeColor = isCake ? "text-rose-600" : "text-orange-600"
    const inactiveColor = "text-gray-400"

    return (
        <div className="w-full max-w-4xl mx-auto py-8">
            {/* Mobile: Vertical */}
            <div className="md:hidden flex flex-col gap-6">
                {STEPS.map((step, idx) => {
                    const isCompleted = idx < activeIdx
                    const isActive = idx === activeIdx
                    const Icon = step.icon
                    return (
                        <div key={step.key} className="flex items-start gap-4 relative">
                            {/* Connector */}
                            {idx !== STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        "absolute left-4 top-8 h-full w-[2px] transition-colors",
                                        isCompleted ? (isCake ? "bg-rose-200" : "bg-orange-200") : "bg-gray-100"
                                    )}
                                />
                            )}
                            {/* Icon */}
                            <motion.div
                                initial={false}
                                animate={{ scale: isActive ? 1.2 : 1 }}
                                className={cn(
                                    "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2",
                                    isActive || isCompleted
                                        ? (isCake ? "bg-rose-600 border-rose-600 text-white" : "bg-orange-600 border-orange-600 text-white")
                                        : "bg-gray-100 border-gray-200 text-gray-400"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                            </motion.div>
                            {/* Text */}
                            <div className="flex flex-col">
                                <span className={cn("font-medium text-sm", isActive ? "text-gray-900" : "text-gray-500")}>
                                    {step.label}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Desktop: Horizontal */}
            <div className="hidden md:flex justify-between relative items-start px-4">
                <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-100 z-0" />
                <motion.div
                    className={cn(
                        "absolute top-5 left-0 h-[2px] z-0 origin-left",
                        isCake ? "bg-rose-600" : "bg-orange-600"
                    )}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: activeIdx / (STEPS.length - 1) }}
                    transition={{ duration: 0.8 }}
                />
                {STEPS.map((step, idx) => {
                    const isCompleted = idx < activeIdx
                    const isActive = idx === activeIdx
                    const Icon = step.icon
                    return (
                        <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
                            <motion.div
                                animate={{ scale: isActive ? 1.2 : 1 }}
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-sm mb-2",
                                    isActive || isCompleted
                                        ? (isCake ? "bg-rose-600 border-rose-600 text-white" : "bg-orange-600 border-orange-600 text-white")
                                        : "bg-white border-gray-200 text-gray-300"
                                )}
                            >
                                <Icon className="w-5 h-5" />
                            </motion.div>
                            <span className={cn("text-sm font-medium text-center", isActive ? "text-gray-900" : "text-gray-400")}>
                                {step.label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
