"use client"

import { CheckCircle2, Clock, Banknote, XCircle } from "lucide-react"
import type { PaymentStatus, PaymentMethod, Fulfilment } from "@/lib/types/payment"
import { getPaymentStatusMessage, getPaymentInstruction } from "@/lib/payment-rules"

interface OrderPaymentStatusCardProps {
    paymentStatus: PaymentStatus
    paymentMethod: PaymentMethod
    fulfilment: Fulfilment
    mpesaTransactionId?: string
    totalAmount: number
}

export function OrderPaymentStatusCard({
    paymentStatus,
    paymentMethod,
    fulfilment,
    mpesaTransactionId,
    totalAmount
}: OrderPaymentStatusCardProps) {
    const statusMessage = getPaymentStatusMessage(paymentStatus, fulfilment)
    const instruction = getPaymentInstruction(paymentMethod, fulfilment, paymentStatus)

    // Determine icon and colors based on status
    const getStatusConfig = () => {
        switch (paymentStatus) {
            case "paid":
                return {
                    icon: CheckCircle2,
                    bgColor: "bg-emerald-50",
                    borderColor: "border-emerald-200",
                    iconColor: "text-emerald-600",
                    textColor: "text-emerald-800"
                }
            case "pending":
            case "initiated":
                return {
                    icon: Clock,
                    bgColor: "bg-amber-50",
                    borderColor: "border-amber-200",
                    iconColor: "text-amber-600",
                    textColor: "text-amber-800"
                }
            case "pay_on_delivery":
            case "pay_on_pickup":
                return {
                    icon: Banknote,
                    bgColor: "bg-blue-50",
                    borderColor: "border-blue-200",
                    iconColor: "text-blue-600",
                    textColor: "text-blue-800"
                }
            case "failed":
                return {
                    icon: XCircle,
                    bgColor: "bg-red-50",
                    borderColor: "border-red-200",
                    iconColor: "text-red-600",
                    textColor: "text-red-800"
                }
        }
    }

    const config = getStatusConfig()
    const Icon = config.icon

    return (
        <div className={`
      ${config.bgColor} ${config.borderColor} 
      border-2 rounded-2xl p-6 space-y-4
    `}>
            <div className="flex items-start gap-4">
                <div className={`${config.bgColor} p-3 rounded-full`}>
                    <Icon className={`h-6 w-6 ${config.iconColor}`} />
                </div>
                <div className="flex-1">
                    <h3 className={`font-bold text-lg ${config.textColor}`}>
                        {statusMessage}
                    </h3>
                    {instruction && (
                        <p className="text-sm text-gray-600 mt-1">
                            {instruction}
                        </p>
                    )}
                </div>
            </div>

            {/* Transaction Details */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
                {mpesaTransactionId && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono font-semibold">{mpesaTransactionId}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-gray-900">{totalAmount.toLocaleString()} KES</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-semibold capitalize">{paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}</span>
                </div>
            </div>
        </div>
    )
}
