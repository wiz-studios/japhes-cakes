"use server"

import crypto from "node:crypto"
import { createServiceSupabaseClient } from "@/lib/supabase-service"
import { checkRateLimit } from "@/lib/rate-limit"
import { initiateMpesaSTK } from "@/lib/mpesa"
import { computeBalance } from "@/lib/payment-balance"
import { isValidKenyaPhone, normalizeKenyaPhone } from "@/lib/phone"

type OrderPaymentSnapshot = {
  id: string
  orderStatus: string
  paymentStatus: string
  paymentMethod: string
  paymentPlan: string | null
  totalAmount: number
  amountPaid: number
  balanceDue: number
  mpesaTransactionId: string | null
  lastCheckoutRequestId: string | null
}

type LatestPaymentSnapshot = {
  id: string
  amount: number | null
  status: "initiated" | "success" | "failed"
  checkoutRequestId: string | null
  transactionId: string | null
  createdAt: string
}

type SnapshotResult =
  | {
      success: true
      order: OrderPaymentSnapshot
      latestPayment: LatestPaymentSnapshot | null
    }
  | {
      success: false
      error: string
    }

type InitiateBalanceResult =
  | {
      success: true
      checkoutRequestId?: string
      merchantRequestId?: string
      customerMessage?: string
    }
  | {
      success: false
      error: string
      retryAfterMs?: number
    }

function isMissingPaymentsTable(error: any) {
  return error?.code === "42P01" || error?.message?.toLowerCase?.().includes("relation \"payments\" does not exist")
}

async function getLatestPayment(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  orderId: string
): Promise<LatestPaymentSnapshot | null> {
  const paymentsQuery = await supabase
    .from("payments")
    .select("id, amount, status, mpesa_checkout_request_id, mpesa_transaction_id, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!paymentsQuery.error && paymentsQuery.data) {
    return {
      id: paymentsQuery.data.id,
      amount: paymentsQuery.data.amount != null ? Number(paymentsQuery.data.amount) : null,
      status: paymentsQuery.data.status as "initiated" | "success" | "failed",
      checkoutRequestId: paymentsQuery.data.mpesa_checkout_request_id || null,
      transactionId: paymentsQuery.data.mpesa_transaction_id || null,
      createdAt: paymentsQuery.data.created_at,
    }
  }

  if (!isMissingPaymentsTable(paymentsQuery.error)) {
    console.warn("[payments-action] Could not query payments table:", paymentsQuery.error)
  }

  const attemptQuery = await supabase
    .from("payment_attempts")
    .select("id, amount, status, result_code, checkout_request_id, mpesa_receipt, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (attemptQuery.error || !attemptQuery.data) return null

  const normalizedStatus: "initiated" | "success" | "failed" =
    attemptQuery.data.status === "success" || attemptQuery.data.result_code === 0 ? "success" : "failed"

  return {
    id: attemptQuery.data.id,
    amount: attemptQuery.data.amount != null ? Number(attemptQuery.data.amount) : null,
    status: normalizedStatus,
    checkoutRequestId: attemptQuery.data.checkout_request_id || null,
    transactionId: attemptQuery.data.mpesa_receipt || null,
    createdAt: attemptQuery.data.created_at,
  }
}

async function recordInitiatedPayment(params: {
  supabase: ReturnType<typeof createServiceSupabaseClient>
  orderId: string
  amount: number
  checkoutRequestId: string
}) {
  const { supabase, orderId, amount, checkoutRequestId } = params

  const { error } = await supabase.from("payments").upsert(
    {
      order_id: orderId,
      amount,
      method: "mpesa",
      status: "initiated",
      mpesa_checkout_request_id: checkoutRequestId,
    },
    { onConflict: "mpesa_checkout_request_id" }
  )

  if (error && !isMissingPaymentsTable(error)) {
    console.warn("[payments-action] Failed to record initiated payment:", error)
  }
}

export async function getOrderPaymentSnapshot(orderId: string, phone?: string): Promise<SnapshotResult> {
  const trimmedOrderId = orderId?.trim()
  if (!trimmedOrderId) {
    return { success: false, error: "Order ID is required" }
  }

  const supabase = createServiceSupabaseClient()

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, status, phone, payment_method, payment_status, payment_plan, total_amount, payment_amount_paid, payment_amount_due, mpesa_transaction_id, mpesa_checkout_request_id"
    )
    .eq("id", trimmedOrderId)
    .maybeSingle()

  if (error || !order) {
    return { success: false, error: "Order not found" }
  }

  const normalizedPhone = phone?.trim() ? normalizeKenyaPhone(phone) : null
  if (normalizedPhone && normalizeKenyaPhone(order.phone || "") !== normalizedPhone) {
    return { success: false, error: "Order lookup failed for this phone number" }
  }

  const balance = computeBalance(order)
  const latestPayment = await getLatestPayment(supabase, order.id)

  return {
    success: true,
    order: {
      id: order.id,
      orderStatus: order.status,
      paymentStatus: order.payment_status || "pending",
      paymentMethod: order.payment_method || "mpesa",
      paymentPlan: order.payment_plan || null,
      totalAmount: balance.totalAmount,
      amountPaid: balance.amountPaid,
      balanceDue: balance.balanceDue,
      mpesaTransactionId: order.mpesa_transaction_id || null,
      lastCheckoutRequestId: order.mpesa_checkout_request_id || null,
    },
    latestPayment,
  }
}

export async function initiateMpesaBalanceSTK(orderId: string, phone: string): Promise<InitiateBalanceResult> {
  const trimmedOrderId = orderId?.trim()
  if (!trimmedOrderId) {
    return { success: false, error: "Order ID is required" }
  }

  const normalizedPhone = normalizeKenyaPhone(phone || "")
  if (!isValidKenyaPhone(normalizedPhone)) {
    return { success: false, error: "Invalid phone number. Use 07XXXXXXXX or 01XXXXXXXX." }
  }

  const supabase = createServiceSupabaseClient()
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, status, phone, payment_method, payment_status, total_amount, payment_amount_paid, payment_amount_due, mpesa_checkout_request_id"
    )
    .eq("id", trimmedOrderId)
    .maybeSingle()

  if (error || !order) {
    return { success: false, error: "Order not found" }
  }

  if (order.status === "cancelled") {
    return { success: false, error: "Cancelled orders cannot receive balance payments." }
  }

  if ((order.payment_method || "mpesa") !== "mpesa") {
    return { success: false, error: "This order is not configured for M-Pesa payments." }
  }

  const orderPhone = normalizeKenyaPhone(order.phone || "")
  if (!orderPhone || orderPhone !== normalizedPhone) {
    return { success: false, error: "Phone number does not match this order." }
  }

  const balance = computeBalance(order)
  if ((order.payment_status || "") === "paid" || balance.balanceDue <= 0) {
    return { success: false, error: "This order is already fully paid." }
  }

  const throttle = checkRateLimit(`status-balance-stk:${order.id}`, 1, 20 * 1000)
  if (!throttle.allowed) {
    return {
      success: false,
      error: "Please wait a few seconds before starting another payment request.",
      retryAfterMs: throttle.retryAfterMs,
    }
  }

  const idempotencyKey = `status-balance:${order.id}:${crypto.randomUUID()}`
  const stk = await initiateMpesaSTK(order.id, normalizedPhone, {
    idempotencyKey,
    correlationId: idempotencyKey,
  })

  if (!stk.success) {
    return { success: false, error: stk.error || "Failed to initiate STK push." }
  }

  if (stk.checkoutRequestId) {
    await recordInitiatedPayment({
      supabase,
      orderId: order.id,
      amount: balance.balanceDue,
      checkoutRequestId: stk.checkoutRequestId,
    })
  }

  return {
    success: true,
    checkoutRequestId: stk.checkoutRequestId,
    merchantRequestId: stk.merchantRequestId,
    customerMessage: stk.customerMessage,
  }
}
