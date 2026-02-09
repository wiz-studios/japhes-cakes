"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Smartphone, Banknote } from "lucide-react"
import type { PaymentPlan, Fulfilment } from "@/lib/types/payment"

interface PaymentMethodSelectorProps {
    fulfilment: Fulfilment
    value: PaymentPlan
    onChange: (plan: PaymentPlan) => void
    totalAmount: number
    mpesaPhone?: string
    onMpesaPhoneChange?: (phone: string) => void
}

export function PaymentMethodSelector({
    fulfilment,
    value,
    onChange,
    totalAmount,
    mpesaPhone = "",
    onMpesaPhoneChange
}: PaymentMethodSelectorProps) {
    const depositAmount = Math.ceil(totalAmount * 0.5)
    const remainingAmount = Math.max(totalAmount - depositAmount, 0)

    return (
        <div className="space-y-4">
            <Label className="text-base font-semibold font-serif">Payment</Label>

            <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentPlan)}>
                {/* Pay Full */}
                <div className="relative">
                    <div className={`
            flex items-start space-x-3 p-4 rounded-2xl border transition-all cursor-pointer shadow-[0_12px_40px_-30px_rgba(15,20,40,0.4)]
            ${value === "full"
                            ? "border-emerald-400/60 bg-emerald-50/40"
                            : "border-white/60 hover:border-emerald-200 bg-white/90"
                        }
          `}>
                        <RadioGroupItem value="full" id="pay-full" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="pay-full" className="flex items-center gap-2 cursor-pointer font-semibold">
                                <Smartphone className="h-5 w-5 text-emerald-600" />
                                Pay Full Now (M-Pesa)
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">
                                Clear the full balance now.
                            </p>

                            <div className="mt-2 text-sm font-semibold text-emerald-700">
                                {totalAmount.toLocaleString()} KES
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deposit Option */}
                <div className="relative">
                    <div className={`
            flex items-start space-x-3 p-4 rounded-2xl border transition-all cursor-pointer shadow-[0_12px_40px_-30px_rgba(15,20,40,0.4)]
            ${value === "deposit"
                            ? "border-blue-400/60 bg-blue-50/40"
                            : "border-white/60 hover:border-blue-200 bg-white/90"
                        }
          `}>
                        <RadioGroupItem value="deposit" id="pay-deposit" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="pay-deposit" className="flex items-center gap-2 cursor-pointer font-semibold">
                                <Banknote className="h-5 w-5 text-blue-600" />
                                Pay 50% Deposit Now
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">
                                Clear the balance on pickup or delivery, or pay the rest now.
                            </p>
                            <div className="mt-2 text-sm font-semibold text-blue-700">
                                {depositAmount.toLocaleString()} KES now · {remainingAmount.toLocaleString()} KES later
                            </div>
                        </div>
                    </div>
                </div>
            </RadioGroup>

            <div className="mt-2">
                <Label htmlFor="mpesa-phone" className="text-sm">M-Pesa Phone Number</Label>
                <Input
                    id="mpesa-phone"
                    type="tel"
                    placeholder="07XX XXX XXX"
                    value={mpesaPhone}
                    onChange={(e) => onMpesaPhoneChange?.(e.target.value)}
                    className="mt-1"
                    required
                />
            </div>
        </div>
    )
}
