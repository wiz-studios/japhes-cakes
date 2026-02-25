"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { OrderPaymentStatusCard } from "@/components/OrderPaymentStatusCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getOrderPaymentSnapshot, initiateMpesaBalanceSTK } from "@/app/actions/payments"
import { isValidKenyaPhone, maskPhoneNumber, normalizeKenyaPhone } from "@/lib/phone"
import type { Fulfilment, PaymentMethod, PaymentStatus } from "@/lib/types/payment"

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
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleInitiatePayment = async () => {
    const normalizedPhone = normalizeKenyaPhone(phone)
    if (!isValidKenyaPhone(normalizedPhone)) {
      setError("Enter a valid M-Pesa phone number (07XXXXXXXX or 01XXXXXXXX).")
      return
    }

    setError(null)
    setFeedback(null)
    setIsSubmitting(true)
    try {
      const response = await initiateMpesaBalanceSTK(orderId, normalizedPhone)
      if (!response.success) {
        setError(response.error)
        return
      }

      setDialogOpen(false)
      setFeedback("STK sent, check your phone to complete payment.")
      const checkoutForTracking = response.checkoutRequestId || activeCheckoutRequestId || null
      setActiveCheckoutRequestId(checkoutForTracking)
      setIsPolling(true)
      await loadSnapshot(checkoutForTracking)
    } catch (actionError) {
      console.error("[status-payment] Failed to initiate STK:", actionError)
      setError("Failed to initiate payment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
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

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      )}

      {isPolling && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Waiting for M-Pesa confirmation. This page refreshes automatically every few seconds.
        </div>
      )}

      {latestPayment && latestPayment.status === "failed" && payment.balanceDue > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Latest payment attempt failed. You can retry using the button above.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
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
