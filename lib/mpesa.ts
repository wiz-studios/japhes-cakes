"use server"

import crypto from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { isValidKenyaPhone, normalizeKenyaPhone } from "@/lib/phone"
import { initiateDarajaStkPush } from "@/lib/mpesa-daraja"
import { runIdempotent } from "@/lib/idempotency"
import { checkRateLimit } from "@/lib/rate-limit"

type InitiateMpesaOptions = {
  idempotencyKey?: string
  correlationId?: string
}

type InitiateMpesaResult = {
  success: boolean
  error?: string
  checkoutRequestId?: string
  merchantRequestId?: string
  customerMessage?: string
}

function getCorrelationId(options?: InitiateMpesaOptions): string {
  return options?.correlationId?.trim() || crypto.randomUUID()
}

function logStk(correlationId: string, message: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.log(`[STK-INIT][${correlationId}] ${message}`, meta)
    return
  }
  console.log(`[STK-INIT][${correlationId}] ${message}`)
}

function isMissingPaymentsTable(error: any) {
  return error?.code === "42P01" || error?.message?.toLowerCase?.().includes("relation \"payments\" does not exist")
}

async function recordInitiatedPayment(params: {
  supabase: any
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
      mpesa_transaction_id: null,
    },
    { onConflict: "mpesa_checkout_request_id" }
  )

  if (error && !isMissingPaymentsTable(error)) {
    console.warn("[STK-INIT] Failed to record initiated payment", error)
  }
}

/**
 * Initiates an M-Pesa STK Push for an existing order.
 * - Validates phone number.
 * - Uses DB-backed idempotency when idempotencyKey is provided.
 * - Prevents rapid duplicate in-flight requests per order.
 */
export async function initiateMpesaSTK(
  orderId: string,
  phone: string,
  options?: InitiateMpesaOptions
): Promise<InitiateMpesaResult> {
  const correlationId = getCorrelationId(options)

  const run = async (): Promise<InitiateMpesaResult> => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    logStk(correlationId, "Request received", { orderId })

    const normalizedPhone = normalizeKenyaPhone(phone)
    if (!isValidKenyaPhone(normalizedPhone)) {
      return { success: false, error: "Invalid phone number. Use 07XXXXXXXX or 01XXXXXXXX" }
    }
    const perPhoneLimit = checkRateLimit(`stk-init-phone:${normalizedPhone}`, 4, 60 * 1000)
    if (!perPhoneLimit.allowed) {
      return { success: false, error: "Too many STK attempts. Please wait before retrying." }
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, friendly_id, total_amount, payment_plan, payment_amount_paid, payment_deposit_amount, payment_status, payment_last_request_amount, mpesa_checkout_request_id"
      )
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      logStk(correlationId, "Order lookup failed", { orderId, error: orderError?.message })
      return { success: false, error: "Order not found" }
    }

    const hasInFlightRequest =
      order.payment_status === "initiated" &&
      Number(order.payment_last_request_amount || 0) > 0 &&
      !!order.mpesa_checkout_request_id

    if (hasInFlightRequest) {
      if (order.mpesa_checkout_request_id) {
        await recordInitiatedPayment({
          supabase,
          orderId: order.id,
          amount: Number(order.payment_last_request_amount || 0),
          checkoutRequestId: order.mpesa_checkout_request_id,
        })
      }
      return {
        success: true,
        checkoutRequestId: order.mpesa_checkout_request_id || undefined,
        customerMessage: "Payment request already sent. Check your phone for the M-Pesa prompt.",
      }
    }

    const alreadyPaid = order.payment_status === "paid"
    const paidAmount = Number(order.payment_amount_paid || 0)
    const totalAmount = Number(order.total_amount || 0)
    const depositAmount = Number(order.payment_deposit_amount || Math.ceil(totalAmount * 0.5))

    if (alreadyPaid) {
      return { success: false, error: "Order already paid" }
    }

    let amountToCharge = totalAmount
    if (order.payment_plan === "deposit") {
      amountToCharge =
        order.payment_status === "deposit_paid"
          ? Math.max(totalAmount - paidAmount, 0)
          : depositAmount
    }

    if (amountToCharge <= 0) {
      return { success: false, error: "No balance due" }
    }

    const orderRef = order.friendly_id || order.id
    const stkResponse = await initiateDarajaStkPush({
      orderRef,
      phone: normalizedPhone,
      amount: amountToCharge,
    })

    const nextStatus = order.payment_status === "deposit_paid" ? "deposit_paid" : "initiated"
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: nextStatus,
        mpesa_checkout_request_id: stkResponse.CheckoutRequestID,
        payment_last_request_amount: amountToCharge,
        mpesa_phone: normalizedPhone,
      })
      .eq("id", order.id)

    if (updateError) {
      logStk(correlationId, "Order update failed", { orderId, error: updateError.message })
      return { success: false, error: updateError.message }
    }

    await recordInitiatedPayment({
      supabase,
      orderId: order.id,
      amount: amountToCharge,
      checkoutRequestId: stkResponse.CheckoutRequestID,
    })

    logStk(correlationId, "STK initiated", {
      orderId,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      amount: amountToCharge,
    })

    return {
      success: true,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
      customerMessage: stkResponse.CustomerMessage,
    }
  }

  const guarded = await runIdempotent<InitiateMpesaResult>({
    scope: `payment-init:${orderId}`,
    idempotencyKey: options?.idempotencyKey,
    ttlSeconds: 180,
    run,
  })

  if (guarded.state === "in_progress") {
    return {
      success: false,
      error: "A payment request for this order is already being processed. Please wait a few seconds.",
    }
  }

  return guarded.result
}
