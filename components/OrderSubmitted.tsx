"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, ArrowRight, Download } from "lucide-react"
import Link from "next/link"
import { formatFriendlyId } from "@/lib/order-helpers"
import { Button } from "@/components/ui/button"
import { OrderPaymentStatusCard } from "@/components/OrderPaymentStatusCard"
import { initiateMpesaSTK } from "@/lib/mpesa"
import BrandLogo from "@/components/BrandLogo"

type PaymentAttempt = {
  id?: string
  mpesa_receipt?: string
  amount?: number
  result_code?: number
  created_at?: string
}

type OrderSubmittedProps = {
  order: any
  paymentAttempts?: PaymentAttempt[]
  isSandbox?: boolean
}

export default function OrderSubmitted({ order, paymentAttempts = [], isSandbox }: OrderSubmittedProps) {
  const router = useRouter()
  // Badge Logic: Only show if explicitly in Sandbox Mode AND not in Production Build (or if intended)
  // User Feedback: "Gate this behind NODE_ENV !== 'production'"
  const showSandboxBadge = isSandbox && process.env.NODE_ENV !== "production"

  const friendlyId = formatFriendlyId(order)
  const isCake = order.order_type === "cake"
  const isDelivery = order.fulfilment === "delivery"
  const formatMoney = (value: number) => `${value.toLocaleString()} KES`

  const successfulAttempts = paymentAttempts
    .filter((attempt) => attempt.result_code === 0 && attempt.mpesa_receipt)
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())


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
    const originalTitle = document.title
    const printableTitle = `Receipt-${friendlyId}`
    let restored = false

    const restoreTitle = () => {
      if (restored) return
      restored = true
      document.title = originalTitle
      window.removeEventListener("afterprint", restoreTitle)
    }

    document.title = printableTitle
    window.addEventListener("afterprint", restoreTitle)
    window.print()
    window.setTimeout(restoreTitle, 1500)
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

  

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center max-w-2xl mx-auto print:min-h-0 print:justify-start print:pt-2 print:px-0">
      

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
        className={`text-3xl font-serif font-bold ${theme.title} mb-2 print:text-2xl print:mb-1`}
      >
        {liveOrder.payment_status === "paid"
          ? "Payment Confirmed"
          : liveOrder.payment_status === "deposit_paid"
            ? "Deposit Confirmed"
            : liveOrder.payment_method === "cash"
              ? "Order Received!"
              : "Complete Payment"}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-lg mb-8 print:text-sm print:mb-4"
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
        className="lux-card p-6 w-full mb-8 print:border-2 print:shadow-none print:p-4 print:mb-4"
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
        className="w-full mb-6 print:hidden"
      >
        <OrderPaymentStatusCard
          paymentStatus={liveOrder.payment_status}
          paymentMethod={liveOrder.payment_method}
          fulfilment={liveOrder.fulfilment}
          mpesaTransactionId={liveOrder.mpesa_transaction_id}
          totalAmount={liveOrder.total_amount || 0}
          amountPaid={liveOrder.payment_amount_paid || 0}
          amountDue={liveOrder.payment_amount_due || 0}
        />

        {/* Retry Logic Display - Show for FAILED or PENDING (if initial push missed) */}
        {(liveOrder.payment_status === "failed" || liveOrder.payment_status === "pending") && liveOrder.payment_method === "mpesa" && (
          <div className="mt-4">
            <Button
              onClick={handleRetryPayment}
              disabled={isRetrying || retryCooldown > 0}
              className="w-full bg-red-100 text-red-700 hover:bg-red-200"
            >
              {isRetrying ? "Sending Request..." : retryCooldown > 0 ? `Wait ${retryCooldown}s` : (liveOrder.payment_status === "pending" ? "Pay Now" : "Payment failed - retry")}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Did the prompt fail to appear? Click above to try again.
            </p>
          </div>
        )}

        {liveOrder.payment_status === "deposit_paid" && liveOrder.payment_method === "mpesa" && liveOrder.payment_amount_due > 0 && (
          <div className="mt-4">
            <Button
              onClick={handleRetryPayment}
              disabled={isRetrying || retryCooldown > 0}
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {isRetrying ? "Sending Request..." : retryCooldown > 0 ? `Wait ${retryCooldown}s` : "Pay Remaining Balance"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Pay the remaining balance now to complete your order.
            </p>
          </div>
        )}

        {/* Initiated Waiting Message (Hardened Copy) */}
        {liveOrder.payment_status === "initiated" && (
          <div className="mt-4 bg-white/80 p-3 rounded-2xl border border-white/60">
            <div className="mb-2 flex items-center justify-center gap-2" aria-hidden="true">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-2.5 w-2.5 rounded-full bg-amber-500"
                  animate={{ y: [0, -6, 0], opacity: [0.45, 1, 0.45], scale: [0.9, 1.1, 0.9] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: dot * 0.15,
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-amber-800 font-medium">
              Waiting for M-Pesa confirmation...
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Please check your phone ({liveOrder.mpesa_phone}) and enter your PIN.
            </p>
          </div>
        )}
      </motion.div>

      {/* Professional Receipt */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full mb-8 break-inside-avoid page-break-inside-avoid print:mb-0"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)] print:shadow-none print:border-2 print:p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400 font-semibold">Receipt</p>
              <div className="mt-2">
                <BrandLogo size="sm" />
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <div><span className="font-semibold text-slate-900">Order:</span> {friendlyId}</div>
              <div><span className="font-semibold text-slate-900">Date:</span> {new Date(liveOrder.created_at).toLocaleString()}</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 py-4 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">Customer</p>
              <p className="mt-1 font-semibold text-slate-900">{liveOrder.customer_name || "Guest"}</p>
              <p className="text-slate-600">{liveOrder.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">Fulfilment</p>
              <p className="mt-1 font-semibold text-slate-900">{isDelivery ? "Delivery" : "Pickup"}</p>
              <p className="text-slate-600">
                {isDelivery ? liveOrder.delivery_zones?.name || "Delivery location" : "Thika Branch"}
              </p>
              {liveOrder.delivery_window && (
                <p className="text-slate-600">Window: {liveOrder.delivery_window}</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold mb-2">Items</p>
            <div className="space-y-3 text-sm text-slate-700">
              {(liveOrder.order_items || []).map((item: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.item_name}</p>
                    {item.notes && <p className="text-xs text-slate-500 mt-1">{item.notes}</p>}
                  </div>
                  {item.quantity && <span className="text-xs font-semibold text-slate-500">Qty {item.quantity}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 mt-4 pt-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(Math.max((liveOrder.total_amount || 0) - (liveOrder.delivery_fee || 0), 0))}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span className="font-semibold text-slate-900">{formatMoney(liveOrder.delivery_fee || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-semibold text-base mt-2">
              <span>Total</span>
              <span>{formatMoney(liveOrder.total_amount || 0)}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 mt-4 pt-4 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Payment Status</span>
              <span className="font-semibold text-slate-900">{liveOrder.payment_status?.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span>Method</span>
              <span className="font-semibold text-slate-900">{liveOrder.payment_method === "mpesa" ? "M-Pesa" : "Cash"}</span>
            </div>
            {liveOrder.mpesa_transaction_id && (
              <div className="flex justify-between">
                <span>Latest Transaction ID</span>
                <span className="font-mono font-semibold text-slate-900">{liveOrder.mpesa_transaction_id}</span>
              </div>
            )}
            {successfulAttempts.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">M-Pesa Receipts</div>
                {successfulAttempts.map((attempt, index) => {
                  const isDeposit = liveOrder.payment_plan === "deposit" && successfulAttempts.length > 1 && index === 0
                  const label = isDeposit ? "Deposit" : successfulAttempts.length > 1 ? `Payment ${index + 1}` : "Payment"
                  return (
                    <div
                      key={attempt.id || `${attempt.mpesa_receipt}-${index}`}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3 text-sm items-center"
                    >
                      <span>{label}</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {attempt.mpesa_receipt}
                      </span>
                      {typeof attempt.amount === "number" ? (
                        <span className="font-semibold text-slate-900">
                          {formatMoney(attempt.amount)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <p className="hidden print:block mt-4 text-center text-[10px] text-slate-500">
            <a href="mailto:wiz.dev.studios@gmail.com" className="underline underline-offset-2 text-slate-600">
              Built by Wiz Dev Studios
            </a>
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-3 w-full print:hidden"
      >
        <Link href={`/status?id=${formatFriendlyId(liveOrder)}&phone=${order.phone}`} className="w-full">
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
