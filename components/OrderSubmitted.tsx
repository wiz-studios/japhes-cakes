"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Confetti from "react-confetti"
import { Check, ArrowRight, Download } from "lucide-react"
import Link from "next/link"
import { formatFriendlyId } from "@/lib/order-helpers"
import { Button } from "@/components/ui/button"
import { OrderPaymentStatusCard } from "@/components/OrderPaymentStatusCard"
import { initiateMpesaSTK } from "@/lib/mpesa"

type OrderSubmittedProps = {
  order: any
  isSandbox?: boolean
}

export default function OrderSubmitted({ order, isSandbox }: OrderSubmittedProps) {
  const router = useRouter()
  // Badge Logic: Only show if explicitly in Sandbox Mode AND not in Production Build (or if intended)
  // User Feedback: "Gate this behind NODE_ENV !== 'production'"
  const showSandboxBadge = isSandbox && process.env.NODE_ENV !== "production"

  const friendlyId = formatFriendlyId(order)
  const isCake = order.order_type === "cake"
  const isDelivery = order.fulfilment === "delivery"


  // Theme colors based on order type
  const theme = isCake ? {
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    title: "text-rose-900",
    primaryBtn: "bg-rose-600 hover:bg-rose-700",
    secondaryBtn: "text-rose-600 hover:bg-rose-50"
  } : {
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    title: "text-orange-900",
    primaryBtn: "bg-orange-600 hover:bg-orange-700",
    secondaryBtn: "text-orange-600 hover:bg-orange-50"
  }

  const handlePrint = () => {
    window.print()
  }

  // State for order and polling
  const [liveOrder, setLiveOrder] = useState(order)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCooldown, setRetryCooldown] = useState(0)

  // Polling logic (v0 Prompt: 5-8 seconds)
  useEffect(() => {
    // If already paid or failed (and not failed-but-retrying), we might not need to poll aggressively?
    // Actually, if failed, we stop polling until retry.
    if (liveOrder.payment_status === "paid" || liveOrder.payment_status === "failed") return

    const interval = setInterval(async () => {
      // Re-fetch order status
      // In a real app we'd use a server action or API route. 
      // For now we simulate or use a lightweight fetch if possible.
      // Since this is a client component, let's assume we can call an action or re-use `router.refresh`?
      // router.refresh() updates server components, but this is a client component receiving props.
      // The prop `order` won't update automatically unless the parent updates.
      // Better to fetch data directly here. Since we don't have a fetcher, let's use router.refresh() 
      // AND maybe a direct action if we had one. 
      // Actually, standard Next.js way: router.refresh() updates the server component wrapper.
      // But we are inside `OrderSubmitted`.
      // Let's implement a simple action to get status to avoid full page reload flicker.

      try {
        // Assuming we have a way to get update. 
        // For v0: let's use a server action we define/import or just router.refresh()
        // Creating a dedicated status action is best. 
        // For expedited dev, I'll assume `getOrderStatus` exists or I create it?
        // Let's use `router.refresh()` which is safest for now without adding more files, 
        // even if less efficient.
        // Wait, `router.refresh()` won't update `order` prop inside this client component easily if it's passed from page.
        // Actually, it does re-render the Server Component which re-renders this Client Component with new props.
        router.refresh()
      } catch (e) { console.error("Poll error", e) }
    }, 5000)

    return () => clearInterval(interval)
  }, [liveOrder.payment_status, router])

  // Watch for prop updates from router.refresh()
  useEffect(() => {
    setLiveOrder(order)
  }, [order])


  const handleRetryPayment = async () => {
    if (!liveOrder.mpesa_phone) return
    setIsRetrying(true)
    try {
      const res = await initiateMpesaSTK(liveOrder.id, liveOrder.mpesa_phone)
      if (res.success) {
        // Optimistic update
        setLiveOrder((prev: any) => ({ ...prev, payment_status: "initiated" }))
        // Cooldown for button (Hardening: 60s to prevent spam)
        setRetryCooldown(60)
        const timer = setInterval(() => {
          setRetryCooldown(c => {
            if (c <= 1) { clearInterval(timer); return 0 }
            return c - 1
          })
        }, 1000)
      } else {
        alert("Retry failed: " + res.error)
      }
    } catch (e) {
      alert("Unexpected error retrying payment")
    } finally {
      setIsRetrying(false)
    }
  }

  // Hydration fix for Confetti (window size varies)
  const [showConfetti, setShowConfetti] = useState(false)
  useEffect(() => setShowConfetti(true), [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center max-w-md mx-auto print:min-h-0 print:justify-start print:pt-8">
      {showConfetti && (
        <div className="print:hidden">
          <Confetti numberOfPieces={200} recycle={false} />
        </div>
      )}

      {showSandboxBadge && (
        <div className="bg-amber-100 border-amber-300 border text-amber-800 px-3 py-1 rounded-full text-xs font-bold mb-4 uppercase tracking-wider print:hidden">
          Test Payment (Sandbox)
        </div>
      )}

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className={`w-20 h-20 rounded-full ${theme.iconBg} flex items-center justify-center mb-6 shadow-sm print:hidden`}
      >
        <Check className={`w-10 h-10 ${theme.iconColor} stroke-[3]`} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`text-3xl font-serif font-bold ${theme.title} mb-2`}
      >
        {liveOrder.payment_status === "paid"
          ? "Payment Confirmed"
          : liveOrder.payment_method === "cash"
            ? "Order Received!"
            : "Complete Payment"}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-lg mb-8"
      >
        Thank you, {liveOrder.customer_name?.split(' ')[0] || "Guest"}.<br />
        {isDelivery
          ? <span>Your order will be delivered to <span className="font-semibold text-gray-900">{liveOrder.delivery_zones?.name || "your location"}</span>.</span>
          : <span>Your order will be ready for pickup at <span className="font-semibold text-gray-900">Thika Branch</span>.</span>
        }
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border p-6 w-full shadow-sm mb-8 print:border-2 print:shadow-none"
      >
        <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-1">
          Order Number
        </div>
        <div className="text-2xl font-mono font-bold tracking-tight text-gray-900">
          {friendlyId}
        </div>
      </motion.div>

      {/* Payment Status Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="w-full mb-6"
      >
        <OrderPaymentStatusCard
          paymentStatus={liveOrder.payment_status}
          paymentMethod={liveOrder.payment_method}
          fulfilment={liveOrder.fulfilment}
          mpesaTransactionId={liveOrder.mpesa_transaction_id}
          totalAmount={liveOrder.total_amount || 0}
        />

        {/* Retry Logic Display - Show for FAILED or PENDING (if initial push missed) */}
        {(liveOrder.payment_status === "failed" || liveOrder.payment_status === "pending") && liveOrder.payment_method === "mpesa" && (
          <div className="mt-4">
            <Button
              onClick={handleRetryPayment}
              disabled={isRetrying || retryCooldown > 0}
              className="w-full bg-red-100 text-red-700 hover:bg-red-200"
            >
              {isRetrying ? "Sending Request..." : retryCooldown > 0 ? `Wait ${retryCooldown}s` : (liveOrder.payment_status === "pending" ? "Pay Now" : "Payment failed — retry")}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Did the prompt fail to appear? Click above to try again.
            </p>
          </div>
        )}

        {/* Initiated Waiting Message (Hardened Copy) */}
        {liveOrder.payment_status === "initiated" && (
          <div className="mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-800 font-medium">
              Waiting for M-Pesa confirmation...
            </p>
            <p className="text-sm text-amber-700 mt-1 animate-pulse">
              Please check your phone ({liveOrder.mpesa_phone}) and enter your PIN.
            </p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-3 w-full print:hidden"
      >
        <Link href={`/status?id=${order.id}&phone=${order.phone}`} className="w-full">
          <Button className={`w-full h-12 text-lg rounded-xl shadow-md transition-all ${theme.primaryBtn}`}>
            Track Order <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Link>

        <Button
          variant="ghost"
          className={`w-full h-12 rounded-xl ${theme.secondaryBtn}`}
          onClick={handlePrint}
        >
          <Download className="mr-2 w-4 h-4" /> Download Receipt
        </Button>
      </motion.div>
    </div>
  )
}
