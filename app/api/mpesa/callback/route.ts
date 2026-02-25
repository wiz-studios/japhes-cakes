import { createClient } from "@supabase/supabase-js"
import { NextResponse, after } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp, getRequestId, logWithRequestId } from "@/lib/request-meta"
import { verifyWebhookRequest } from "@/lib/webhook-auth"

type ParsedStkCallback = {
  checkoutRequestId: string
  merchantRequestId: string | null
  resultCode: number
  resultDesc: string | null
  mpesaReceiptNumber: string | null
  callbackAmount: number | null
  callbackPhone: string | null
}

function verifyCallbackShape(payload: any) {
  if (!payload || typeof payload !== "object") return false

  const darajaCb = payload?.Body?.stkCallback
  if (darajaCb) {
    if (typeof darajaCb.CheckoutRequestID !== "string") return false
    if (typeof darajaCb.ResultCode !== "number") return false
    return true
  }

  if (!payload.checkoutRequestId || typeof payload.checkoutRequestId !== "string") return false
  if (typeof payload.resultCode !== "number") return false
  return true
}

function parseStkCallback(payload: any): ParsedStkCallback | null {
  const darajaCb = payload?.Body?.stkCallback

  const checkoutRequestId = darajaCb?.CheckoutRequestID || payload.checkoutRequestId
  const resultCode = typeof darajaCb?.ResultCode === "number" ? darajaCb.ResultCode : payload.resultCode
  const resultDesc = darajaCb?.ResultDesc || payload.resultDesc || null
  const merchantRequestId = darajaCb?.MerchantRequestID || payload.merchantRequestId || null

  if (!checkoutRequestId || typeof resultCode !== "number") return null

  let mpesaReceiptNumber: string | null = null
  let callbackAmount: number | null = null
  let callbackPhone: string | null = null

  const items = darajaCb?.CallbackMetadata?.Item || []
  for (const item of items) {
    if (item?.Name === "MpesaReceiptNumber") mpesaReceiptNumber = String(item.Value)
    if (item?.Name === "Amount") callbackAmount = Number(item.Value)
    if (item?.Name === "PhoneNumber") callbackPhone = String(item.Value)
  }

  return {
    checkoutRequestId,
    merchantRequestId,
    resultCode,
    resultDesc,
    mpesaReceiptNumber,
    callbackAmount,
    callbackPhone,
  }
}

function createMpesaServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

async function markAttemptProcessed(
  supabase: ReturnType<typeof createMpesaServiceClient>,
  callback: ParsedStkCallback
) {
  const timestamp = new Date().toISOString()

  if (callback.mpesaReceiptNumber) {
    await supabase
      .from("payment_attempts")
      .update({ processed_at: timestamp })
      .eq("mpesa_receipt", callback.mpesaReceiptNumber)
  }

  await supabase
    .from("payment_attempts")
    .update({ processed_at: timestamp })
    .eq("checkout_request_id", callback.checkoutRequestId)
}

function isMissingPaymentsTable(error: any) {
  return error?.code === "42P01" || error?.message?.toLowerCase?.().includes("relation \"payments\" does not exist")
}

async function syncPaymentsLedger(params: {
  supabase: ReturnType<typeof createMpesaServiceClient>
  callback: ParsedStkCallback
  orderId: string | null
  fallbackAmount: number | null
  requestId: string
}) {
  const { supabase, callback, orderId, fallbackAmount, requestId } = params
  const normalizedStatus: "success" | "failed" = callback.resultCode === 0 ? "success" : "failed"

  const { data: existing, error: existingError } = await supabase
    .from("payments")
    .select("id, status, amount, lipana_transaction_id")
    .eq("lipana_checkout_request_id", callback.checkoutRequestId)
    .maybeSingle()

  if (existingError) {
    if (!isMissingPaymentsTable(existingError)) {
      console.error(`[${requestId}] [STK-CALLBACK] Payments ledger lookup failed`, existingError)
    }
    return {
      alreadySuccessful: false,
      amount: callback.callbackAmount ?? fallbackAmount,
    }
  }

  if (existing?.status === "success") {
    return {
      alreadySuccessful: true,
      amount: Number(existing.amount ?? callback.callbackAmount ?? fallbackAmount ?? 0),
    }
  }

  const derivedAmount = callback.callbackAmount ?? Number(existing?.amount ?? fallbackAmount ?? 0)
  const amount = Number.isFinite(derivedAmount) && derivedAmount > 0 ? derivedAmount : null
  const payload = {
    order_id: orderId,
    amount,
    method: "mpesa",
    status: normalizedStatus,
    lipana_transaction_id: callback.mpesaReceiptNumber || existing?.lipana_transaction_id || null,
    lipana_checkout_request_id: callback.checkoutRequestId,
  }

  if (existing?.id) {
    const { error: updateError } = await supabase.from("payments").update(payload).eq("id", existing.id)
    if (updateError && !isMissingPaymentsTable(updateError)) {
      console.error(`[${requestId}] [STK-CALLBACK] Payments ledger update failed`, updateError)
    }
  } else {
    const { error: insertError } = await supabase.from("payments").insert(payload)
    if (insertError && !isMissingPaymentsTable(insertError)) {
      console.error(`[${requestId}] [STK-CALLBACK] Payments ledger insert failed`, insertError)
    }
  }

  return {
    alreadySuccessful: false,
    amount: amount == null ? null : Number(amount),
  }
}

async function processStkCallback(payload: any, requestId: string) {
  const callback = parseStkCallback(payload)
  if (!callback) {
    logWithRequestId(requestId, "[STK-CALLBACK] Missing callback identifiers")
    return
  }

  const supabase = createMpesaServiceClient()

  if (callback.mpesaReceiptNumber) {
    const { data: existingReceipt } = await supabase
      .from("payment_attempts")
      .select("processed_at")
      .eq("mpesa_receipt", callback.mpesaReceiptNumber)
      .maybeSingle()

    if (existingReceipt?.processed_at) {
      logWithRequestId(requestId, "[STK-CALLBACK] Duplicate receipt ignored", {
        receipt: callback.mpesaReceiptNumber,
      })
      return
    }
  }

  const { data: order, error: findError } = await supabase
    .from("orders")
    .select(
      "id, payment_status, payment_plan, total_amount, payment_amount_paid, payment_deposit_amount, payment_last_request_amount, mpesa_transaction_id"
    )
    .eq("mpesa_checkout_request_id", callback.checkoutRequestId)
    .single()

  const { error: attemptError } = await supabase.from("payment_attempts").insert({
    order_id: order?.id ?? null,
    checkout_request_id: callback.checkoutRequestId,
    merchant_request_id: callback.merchantRequestId,
    mpesa_receipt: callback.mpesaReceiptNumber,
    result_code: callback.resultCode,
    result_desc: callback.resultDesc,
    amount: callback.callbackAmount,
    phone: callback.callbackPhone,
    status: callback.resultCode === 0 ? "success" : "failed",
    raw_payload: payload,
  })

  if (attemptError?.code === "23505") {
    const { data: existingAttempt } = await supabase
      .from("payment_attempts")
      .select("processed_at")
      .eq("checkout_request_id", callback.checkoutRequestId)
      .maybeSingle()

    if (existingAttempt?.processed_at) {
      const alreadySettled = order?.payment_status === "paid" || callback.resultCode !== 0
      if (alreadySettled) {
        logWithRequestId(requestId, "[STK-CALLBACK] Duplicate checkout callback ignored", {
          checkoutRequestId: callback.checkoutRequestId,
        })
        return
      }
    }
  } else if (attemptError) {
    console.error(`[${requestId}] [STK-CALLBACK] Failed to log attempt`, attemptError)
  }

  const ledger = await syncPaymentsLedger({
    supabase,
    callback,
    orderId: order?.id ?? null,
    fallbackAmount: Number(order?.payment_last_request_amount || 0) || null,
    requestId,
  })

  if (ledger.alreadySuccessful && order?.payment_status === "paid") {
    logWithRequestId(requestId, "[STK-CALLBACK] Duplicate successful payment ignored", {
      orderId: order.id,
      checkoutRequestId: callback.checkoutRequestId,
    })
    await markAttemptProcessed(supabase, callback)
    return
  }

  if (findError || !order) {
    logWithRequestId(requestId, "[STK-CALLBACK] Order not found for checkout ID", {
      checkoutRequestId: callback.checkoutRequestId,
    })
    await markAttemptProcessed(supabase, callback)
    return
  }

  if (order.payment_status === "paid") {
    logWithRequestId(requestId, "[STK-CALLBACK] Order already paid; callback ignored", { orderId: order.id })
    await markAttemptProcessed(supabase, callback)
    return
  }

  if (callback.resultCode === 0) {
    const totalAmount = Number(order.total_amount || 0)
    const paidAmount = Number(order.payment_amount_paid || 0)
    const depositAmount = Number(order.payment_deposit_amount || Math.ceil(totalAmount * 0.5))
    const requestAmount = Number(order.payment_last_request_amount || 0)

    const ledgerAmount = Number(ledger.amount || 0)
    const increment =
      ledgerAmount || requestAmount || (order.payment_plan === "deposit" && paidAmount < totalAmount ? depositAmount : totalAmount)
    const nextPaid = Math.min(totalAmount, paidAmount + increment)
    const nextDue = Math.max(totalAmount - nextPaid, 0)
    const nextStatus: "paid" | "deposit_paid" = nextPaid >= totalAmount ? "paid" : "deposit_paid"

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: nextStatus,
        payment_amount_paid: nextPaid,
        payment_amount_due: nextDue,
        payment_last_request_amount: null,
        mpesa_transaction_id:
          callback.mpesaReceiptNumber || order.mpesa_transaction_id || `STK_${Date.now().toString(36)}`,
      })
      .eq("id", order.id)

    if (updateError) {
      console.error(`[${requestId}] [STK-CALLBACK] Order update failed`, updateError)
      return
    }

    logWithRequestId(requestId, "[STK-CALLBACK] Order payment advanced", {
      orderId: order.id,
      nextStatus,
      nextPaid,
      nextDue,
    })
  } else {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        payment_last_request_amount: null,
      })
      .eq("id", order.id)

    if (updateError) {
      console.error(`[${requestId}] [STK-CALLBACK] Failed to set failed status`, updateError)
      return
    }

    logWithRequestId(requestId, "[STK-CALLBACK] Order marked failed", {
      orderId: order.id,
      reason: callback.resultDesc || "Unknown",
    })
  }

  await markAttemptProcessed(supabase, callback)
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const ip = getClientIp(request)

  try {
    const limit = checkRateLimit(`mpesa-callback:${ip}`, 240, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded", requestId }, { status: 429 })
    }

    const rawBody = await request.text()
    const webhookAuth = verifyWebhookRequest({
      request,
      rawBody,
      sharedSecretEnv: process.env.MPESA_CALLBACK_SECRET,
      signatureSecretEnv: process.env.MPESA_CALLBACK_HMAC_SECRET,
      failClosedInProduction: true,
    })
    if (!webhookAuth.ok) {
      console.warn(`[${requestId}] [STK-CALLBACK] Webhook auth failed: ${webhookAuth.reason || "unknown"}`)
      return NextResponse.json({ error: "Invalid signature", requestId }, { status: 401 })
    }

    let payload: any
    try {
      payload = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      return NextResponse.json({ error: "Invalid JSON", requestId }, { status: 400 })
    }

    if (!verifyCallbackShape(payload)) {
      return NextResponse.json({ error: "Invalid callback payload", requestId }, { status: 400 })
    }

    after(async () => {
      try {
        await processStkCallback(payload, requestId)
      } catch (error) {
        console.error(`[${requestId}] [STK-CALLBACK] Async processing failed`, error)
      }
    })

    return NextResponse.json({ received: true, requestId })
  } catch (err) {
    console.error(`[${requestId}] [STK-CALLBACK] Handler error`, err)
    return NextResponse.json({ received: true, requestId })
  }
}
