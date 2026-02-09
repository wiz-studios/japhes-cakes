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
    amountPaid?: number | null
    amountDue?: number | null
}

export function OrderPaymentStatusCard({
    paymentStatus,
    paymentMethod,
    fulfilment,
    mpesaTransactionId,
    totalAmount,
    amountPaid,
    amountDue
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
            case "deposit_paid":
                return {
                    icon: CheckCircle2,
                    bgColor: "bg-amber-50",
                    borderColor: "border-amber-200",
                    iconColor: "text-amber-600",
                    textColor: "text-amber-800"
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
      border rounded-3xl p-6 space-y-4 shadow-[0_18px_50px_-40px_rgba(15,20,40,0.35)]
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
            <div className="space-y-2 pt-2 border-t border-white/60">
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
                {typeof amountPaid === "number" && amountPaid > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-semibold text-emerald-700">{amountPaid.toLocaleString()} KES</span>
                    </div>
                )}
                {typeof amountDue === "number" && amountDue > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Balance Due:</span>
                        <span className="font-semibold text-slate-700">{amountDue.toLocaleString()} KES</span>
                    </div>
                )}
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-semibold capitalize">{paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}</span>
                </div>
            </div>
        </div>
    )
}
