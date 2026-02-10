"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Smartphone, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidKenyaPhone, normalizeKenyaPhone } from "@/lib/phone"

/**
 * Payment Confirmation Page (Optional for v1)
 * This page would integrate with M-Pesa API in production
 * For now, it simulates the payment flow
 */
import { Suspense } from "react"

function PaymentConfirmContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orderId = searchParams.get("orderId")
    const amount = searchParams.get("amount")
    const phone = searchParams.get("phone") || ""

    const [mpesaPhone, setMpesaPhone] = useState(phone)
    const [processing, setProcessing] = useState(false)

    const handlePayment = async () => {
        if (!isValidKenyaPhone(mpesaPhone)) {
            alert("Please enter a valid phone number")
            return
        }

        setProcessing(true)
        await new Promise(resolve => setTimeout(resolve, 2000))
        router.push(`/order/submitted?id=${orderId}`)
    }

    const handlePayLater = () => {
        router.push(`/order/submitted?id=${orderId}`)
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(140deg,#f6f2f7_0%,#eef1f8_55%,#eaeef7_100%)] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lux-card p-8 max-w-md w-full"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2 font-serif">
                        Complete Payment
                    </h1>
                    <p className="text-gray-600">
                        Pay via M-Pesa to confirm your order
                    </p>
                </div>

                <div className="bg-white/80 rounded-2xl p-4 mb-6 border border-white/60">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Amount Due</span>
                        <span className="text-2xl font-bold text-gray-900">
                            {amount ? `${parseInt(amount).toLocaleString()} KES` : "Loading..."}
                        </span>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                        <Input
                            id="mpesa-phone"
                            type="tel"
                            placeholder="07XX XXX XXX"
                            value={mpesaPhone}
                            onChange={(e) => setMpesaPhone(normalizeKenyaPhone(e.target.value))}
                            inputMode="numeric"
                            maxLength={10}
                            className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            You'll receive an STK push to complete payment
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={handlePayment}
                        disabled={processing}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing Payment...
                            </>
                        ) : (
                            <>
                                Pay Now
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={handlePayLater}
                        disabled={processing}
                        className="w-full"
                    >
                        I'll Pay Later
                    </Button>
                </div>

                <div className="mt-6 p-4 bg-white/80 rounded-2xl border border-white/60">
                    <p className="text-xs text-blue-800">
                        <strong>Note:</strong> This is a demo payment page. In production, this would integrate with M-Pesa API for real transactions.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default function PaymentConfirmPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>}>
            <PaymentConfirmContent />
        </Suspense>
    )
}
