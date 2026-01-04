"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Smartphone, Banknote } from "lucide-react"
import type { PaymentMethod, Fulfilment } from "@/lib/types/payment"

interface PaymentMethodSelectorProps {
    fulfilment: Fulfilment
    value: PaymentMethod
    onChange: (method: PaymentMethod) => void
    mpesaPhone?: string
    onMpesaPhoneChange?: (phone: string) => void
}

export function PaymentMethodSelector({
    fulfilment,
    value,
    onChange,
    mpesaPhone = "",
    onMpesaPhoneChange
}: PaymentMethodSelectorProps) {
    const cashLabel = fulfilment === "delivery" ? "Pay on Delivery" : "Pay on Pickup"
    const cashDescription = fulfilment === "delivery"
        ? "Payment will be collected when your order arrives"
        : "Payment will be made when you collect your order"

    return (
        <div className="space-y-4">
            <Label className="text-base font-semibold">Payment Method</Label>

            <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)}>
                {/* M-Pesa Option */}
                <div className="relative">
                    <div className={`
            flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer
            ${value === "mpesa"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-200 bg-white"
                        }
          `}>
                        <RadioGroupItem value="mpesa" id="mpesa" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="mpesa" className="flex items-center gap-2 cursor-pointer font-semibold">
                                <Smartphone className="h-5 w-5 text-emerald-600" />
                                M-Pesa
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">
                                Pay now via mobile money
                            </p>

                            {value === "mpesa" && (
                                <div className="mt-3">
                                    <Label htmlFor="mpesa-phone" className="text-sm">Phone Number</Label>
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
                            )}
                        </div>
                    </div>
                </div>

                {/* Cash Option */}
                <div className="relative">
                    <div className={`
            flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer
            ${value === "cash"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-200 bg-white"
                        }
          `}>
                        <RadioGroupItem value="cash" id="cash" className="mt-1" />
                        <div className="flex-1">
                            <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer font-semibold">
                                <Banknote className="h-5 w-5 text-blue-600" />
                                {cashLabel}
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">
                                {cashDescription}
                            </p>
                        </div>
                    </div>
                </div>
            </RadioGroup>
        </div>
    )
}
