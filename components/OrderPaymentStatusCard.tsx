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
                    badgeBg: "bg-emerald-50",
                    badgeBorder: "border-emerald-200",
                    badgeText: "text-emerald-700",
                    iconColor: "text-emerald-600",
                }
            case "deposit_paid":
                return {
                    icon: CheckCircle2,
                    badgeBg: "bg-amber-50",
                    badgeBorder: "border-amber-200",
                    badgeText: "text-amber-700",
                    iconColor: "text-amber-600",
                }
            case "pending":
            case "initiated":
                return {
                    icon: Clock,
                    badgeBg: "bg-amber-50",
                    badgeBorder: "border-amber-200",
                    badgeText: "text-amber-700",
                    iconColor: "text-amber-600",
                }
            case "pay_on_delivery":
            case "pay_on_pickup":
                return {
                    icon: Banknote,
                    badgeBg: "bg-sky-50",
                    badgeBorder: "border-sky-200",
                    badgeText: "text-sky-700",
                    iconColor: "text-sky-600",
                }
            case "failed":
                return {
                    icon: XCircle,
                    badgeBg: "bg-rose-50",
                    badgeBorder: "border-rose-200",
                    badgeText: "text-rose-700",
                    iconColor: "text-rose-600",
                }
        }
    }

    const config = getStatusConfig()
    const Icon = config.icon

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl border ${config.badgeBorder} ${config.badgeBg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-semibold">Payment Status</p>
                        <h3 className="text-lg font-semibold text-slate-900 mt-1">{statusMessage}</h3>
                        {instruction && (
                            <p className="text-sm text-slate-600 mt-1">
                                {instruction}
                            </p>
                        )}
                    </div>
                </div>
                <span className={`h-fit rounded-full border px-3 py-1 text-xs font-semibold ${config.badgeBg} ${config.badgeBorder} ${config.badgeText}`}>
                    {paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}
                </span>
            </div>

            {/* Transaction Details */}
            <div className="mt-4 divide-y divide-slate-100 text-sm">
                {mpesaTransactionId && (
                    <div className="flex justify-between py-2 text-slate-600">
                        <span>Transaction ID</span>
                        <span className="font-mono font-semibold text-slate-900">{mpesaTransactionId}</span>
                    </div>
                )}
                <div className="flex justify-between py-2 text-slate-600">
                    <span>Amount</span>
                    <span className="font-semibold text-slate-900">{totalAmount.toLocaleString()} KES</span>
                </div>
                {typeof amountPaid === "number" && amountPaid > 0 && (
                    <div className="flex justify-between py-2 text-slate-600">
                        <span>Paid</span>
                        <span className="font-semibold text-emerald-700">{amountPaid.toLocaleString()} KES</span>
                    </div>
                )}
                {typeof amountDue === "number" && amountDue > 0 && (
                    <div className="flex justify-between py-2 text-slate-600">
                        <span>Balance Due</span>
                        <span className="font-semibold text-slate-900">{amountDue.toLocaleString()} KES</span>
                    </div>
                )}
            </div>
        </div>
    )
}
