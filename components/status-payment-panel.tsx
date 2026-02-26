"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { OrderPaymentStatusCard } from "@/components/OrderPaymentStatusCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getOrderPaymentSnapshot, initiateMpesaBalanceSTK } from "@/app/actions/payments"
import { isValidKenyaPhone, maskPhoneNumber, normalizeKenyaPhone } from "@/lib/phone"
import type { Fulfilment, PaymentMethod, PaymentStatus } from "@/lib/types/payment"
import { StateMessageCard } from "@/components/ui/state-message-card"
import PaymentProgressTracker, { paymentStatusToProgressState } from "@/components/PaymentProgressTracker"
import { useToast } from "@/hooks/use-toast"

type PaymentState = {
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
  totalAmount: number
  amountPaid: number
  balanceDue: number
  mpesaTransactionId: string | null
  lastCheckoutRequestId: string | null
}

type LatestPaymentState = {
  id: string
  amount: number | null
  status: "initiated" | "success" | "failed"
  checkoutRequestId: string | null
  transactionId: string | null
  createdAt: string
} | null

type NoticeVariant = "info" | "success" | "warning" | "error"

type PaymentNotice = {
  variant: NoticeVariant
  title: string
  description?: string
} | null

export function StatusPaymentPanel({
  orderId,
  fulfilment,
  initialPhone,
  initialState,
}: {
  orderId: string
  fulfilment: Fulfilment
  initialPhone: string
  initialState: PaymentState
}) {
  const [payment, setPayment] = useState<PaymentState>(initialState)
  const [latestPayment, setLatestPayment] = useState<LatestPaymentState>(null)
  const [phone, setPhone] = useState(initialPhone)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(initialState.paymentStatus === "initiated")
  const [activeCheckoutRequestId, setActiveCheckoutRequestId] = useState<string | null>(
    initialState.lastCheckoutRequestId || null
  )
  const [notice, setNotice] = useState<PaymentNotice>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const lastToastStatusRef = useRef<string | null>(null)
  const didHydrateStatusRef = useRef(false)

  const loadSnapshot = useCallback(async (trackedCheckoutOverride?: string | null) => {
    const response = await getOrderPaymentSnapshot(orderId, normalizeKenyaPhone(initialPhone || ""))
    if (!response.success) {
      setError(response.error)
      return
    }

    setPayment({
      orderStatus: response.order.orderStatus,
      paymentStatus: response.order.paymentStatus,
      paymentMethod: response.order.paymentMethod,
      totalAmount: response.order.totalAmount,
      amountPaid: response.order.amountPaid,
      balanceDue: response.order.balanceDue,
      mpesaTransactionId: response.order.mpesaTransactionId,
      lastCheckoutRequestId: response.order.lastCheckoutRequestId,
    })
    setLatestPayment(response.latestPayment)

    const trackedCheckoutId =
      trackedCheckoutOverride ?? activeCheckoutRequestId ?? response.order.lastCheckoutRequestId ?? null
    const latestMatchesTracked = trackedCheckoutId
      ? response.latestPayment?.checkoutRequestId === trackedCheckoutId
      : false
    const latestSettled = latestMatchesTracked
      ? response.latestPayment?.status === "success" || response.latestPayment?.status === "failed"
      : false
    const settled = response.order.paymentStatus === "paid" || response.order.paymentStatus === "failed" || latestSettled

    if (settled) {
      setIsPolling(false)
    }
  }, [activeCheckoutRequestId, initialPhone, orderId])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    if (!isPolling) return

    const timer = setInterval(() => {
      void loadSnapshot()
    }, 4000)

    return () => clearInterval(timer)
  }, [isPolling, loadSnapshot])

  useEffect(() => {
    if (isPolling) {
      setNotice({
        variant: "warning",
        title: "Waiting for M-Pesa confirmation",
        description: "STK was sent. This page refreshes automatically every few seconds.",
      })
      return
    }

    const paymentStatus = String(payment.paymentStatus || "").toLowerCase()

    if (paymentStatus === "paid") {
      setNotice({
        variant: "success",
        title: "Payment confirmed",
        description: "Your balance payment was received and this order is now fully paid.",
      })
      return
    }

    if (paymentStatus === "deposit_paid" && payment.balanceDue > 0) {
      setNotice({
        variant: "info",
        title: "Deposit received",
        description: `Balance due: ${payment.balanceDue.toLocaleString()} KES. You can clear it anytime before fulfilment.`,
      })
      return
    }

    if (paymentStatus === "failed" || paymentStatus === "expired") {
      setNotice({
        variant: "error",
        title: paymentStatus === "expired" ? "Payment expired" : "Payment failed",
        description: "No charge was confirmed. You can retry using the button below.",
      })
      return
    }

    setNotice(null)
  }, [isPolling, payment.balanceDue, payment.paymentStatus])

  useEffect(() => {
    const status = latestPayment?.status
    if (!status) return

    if (!didHydrateStatusRef.current) {
      didHydrateStatusRef.current = true
      lastToastStatusRef.current = status
      return
    }

    if (lastToastStatusRef.current === status) return
    lastToastStatusRef.current = status

    if (status === "success") {
      toast({
        title: "Payment confirmed",
        description:
          payment.balanceDue > 0
            ? "Your payment was received. Remaining balance is updated."
            : "Your order is now fully paid.",
      })
      return
    }

    if (status === "failed") {
      toast({
        title: "Payment failed",
        description: "Retry payment when ready.",
        variant: "destructive",
      })
    }
  }, [latestPayment?.status, payment.balanceDue, toast])

  const canInitiateBalancePayment = useMemo(() => {
    if (payment.orderStatus === "cancelled") return false
    if (payment.paymentMethod !== "mpesa") return false
    return payment.balanceDue > 0
  }, [payment.balanceDue, payment.orderStatus, payment.paymentMethod])

  const actionLabel = useMemo(() => {
    if (payment.paymentStatus === "deposit_paid") return "Pay Remaining Balance"
    if (payment.paymentStatus === "failed") return "Retry Payment"
    return "Pay Now"
  }, [payment.paymentStatus])

  const paymentProgress = useMemo(() => {
    if (latestPayment?.status === "failed" && payment.balanceDue > 0) return "failed"
    if (isPolling) return "prompted"
    return paymentStatusToProgressState(payment.paymentStatus)
  }, [isPolling, latestPayment?.status, payment.balanceDue, payment.paymentStatus])

  const handleInitiatePayment = async () => {
    const normalizedPhone = normalizeKenyaPhone(phone)
    if (!isValidKenyaPhone(normalizedPhone)) {
      setError("Enter a valid M-Pesa phone number (07XXXXXXXX or 01XXXXXXXX).")
      toast({
        title: "Invalid phone number",
        description: "Use 07XXXXXXXX or 01XXXXXXXX for M-Pesa prompts.",
        variant: "destructive",
      })
      return
    }

    setError(null)
    setNotice({
      variant: "warning",
      title: "Waiting for M-Pesa confirmation",
      description: "STK was sent. Check your phone and enter your PIN.",
    })
    setIsSubmitting(true)
    try {
      const response = await initiateMpesaBalanceSTK(orderId, normalizedPhone)
      if (!response.success) {
        setError(response.error)
        toast({
          title: "Could not start payment",
          description: response.error,
          variant: "destructive",
        })
        return
      }

      setDialogOpen(false)
      toast({
        title: "STK sent",
        description: "Check your phone and enter your M-Pesa PIN.",
      })
      const checkoutForTracking = response.checkoutRequestId || activeCheckoutRequestId || null
      setActiveCheckoutRequestId(checkoutForTracking)
      setIsPolling(true)
      await loadSnapshot(checkoutForTracking)
    } catch (actionError) {
      console.error("[status-payment] Failed to initiate STK:", actionError)
      setError("Failed to initiate payment. Please try again.")
      setNotice({
        variant: "error",
        title: "Payment request failed",
        description: "Please retry in a few seconds.",
      })
      toast({
        title: "Payment request failed",
        description: "Please retry in a few seconds.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <PaymentProgressTracker state={paymentProgress} />

      <OrderPaymentStatusCard
        paymentStatus={payment.paymentStatus as PaymentStatus}
        paymentMethod={payment.paymentMethod as PaymentMethod}
        fulfilment={fulfilment}
        mpesaTransactionId={payment.mpesaTransactionId || undefined}
        totalAmount={payment.totalAmount}
        amountPaid={payment.amountPaid}
        amountDue={payment.balanceDue}
      />

      {canInitiateBalancePayment && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{actionLabel}</p>
              <p className="text-xs text-slate-500 mt-1">
                Balance due: {payment.balanceDue.toLocaleString()} KES
              </p>
            </div>
            <Button
              className="h-10 rounded-full bg-slate-900 px-5 text-white hover:bg-slate-800"
              onClick={() => setDialogOpen(true)}
              disabled={isSubmitting}
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      )}

      {notice && <StateMessageCard variant={notice.variant} title={notice.title} description={notice.description} />}

      {error && (
        <StateMessageCard variant="error" title={error} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl border border-slate-200 bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900">{actionLabel}</DialogTitle>
            <DialogDescription>
              Confirm the M-Pesa number to receive the STK prompt. Current phone:{" "}
              <span className="font-semibold text-slate-700">{maskPhoneNumber(initialPhone)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold text-slate-900">{payment.totalAmount.toLocaleString()} KES</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Paid</span>
                <span className="font-semibold text-emerald-700">{payment.amountPaid.toLocaleString()} KES</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Balance Due</span>
                <span className="font-semibold text-slate-900">{payment.balanceDue.toLocaleString()} KES</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance-phone">M-Pesa Phone Number</Label>
              <Input
                id="balance-phone"
                value={phone}
                inputMode="numeric"
                maxLength={10}
                className="border-slate-200 bg-white"
                onChange={(event) => setPhone(normalizeKenyaPhone(event.target.value))}
                placeholder="07XXXXXXXX"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-slate-300"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
              onClick={handleInitiatePayment}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending STK...
                </>
              ) : (
                actionLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
