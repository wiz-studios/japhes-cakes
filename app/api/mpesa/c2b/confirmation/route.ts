import { NextResponse, after } from "next/server"
import { isValidKenyaPhone, normalizeKenyaPhone } from "@/lib/phone"
import {
  createMpesaServiceClient,
  findOrderByBillReference,
  normalizeBillReference,
  parseMpesaAmount,
} from "@/lib/mpesa-c2b"
import { verifyWebhookRequest } from "@/lib/webhook-auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp, getRequestId, logWithRequestId } from "@/lib/request-meta"

type C2BConfirmationPayload = {
  TransID?: string
  TransAmount?: number | string
  BillRefNumber?: string
  AccountReference?: string
  MSISDN?: string | number
  PhoneNumber?: string | number
  ThirdPartyTransID?: string
}

function c2bConfirmationResponse(ResultCode: number, ResultDesc: string) {
  return NextResponse.json({ ResultCode, ResultDesc })
}

async function markAttemptProcessed(
  supabase: ReturnType<typeof createMpesaServiceClient>,
  receipt: string
) {
  await supabase
    .from("payment_attempts")
    .update({ processed_at: new Date().toISOString() })
    .eq("mpesa_receipt", receipt)
}

async function processConfirmation(payload: C2BConfirmationPayload, requestId: string) {
  const transId = String(payload?.TransID || "").trim()
  if (!transId) {
    logWithRequestId(requestId, "[C2B-CONFIRM] Missing TransID")
    return
  }

  const billRef = normalizeBillReference(payload?.BillRefNumber || payload?.AccountReference)
  const amount = parseMpesaAmount(payload?.TransAmount)
  const rawPhone = String(payload?.MSISDN || payload?.PhoneNumber || "").trim()
  const normalizedPhone = normalizeKenyaPhone(rawPhone)
  const hasValidPhone = isValidKenyaPhone(normalizedPhone)

  const supabase = createMpesaServiceClient()
  const { data: existingReceipt } = await supabase
    .from("payment_attempts")
    .select("processed_at")
    .eq("mpesa_receipt", transId)
    .maybeSingle()

  if (existingReceipt?.processed_at) {
    logWithRequestId(requestId, "[C2B-CONFIRM] Duplicate receipt ignored", { receipt: transId })
    return
  }

  const order = billRef ? await findOrderByBillReference(supabase, billRef) : null

  const { error: attemptError } = await supabase.from("payment_attempts").insert({
    order_id: order?.id ?? null,
    checkout_request_id: null,
    merchant_request_id: payload?.ThirdPartyTransID || null,
    mpesa_receipt: transId,
    result_code: 0,
    result_desc: "C2B confirmation received",
    amount,
    phone: hasValidPhone ? normalizedPhone : rawPhone || null,
    status: "success",
    raw_payload: payload,
  })

  if (attemptError && attemptError.code !== "23505") {
    console.error(`[${requestId}] [C2B-CONFIRM] Failed to log payment attempt:`, attemptError.message)
  }

  if (attemptError?.code === "23505") {
    const { data: duplicate } = await supabase
      .from("payment_attempts")
      .select("processed_at")
      .eq("mpesa_receipt", transId)
      .maybeSingle()

    if (duplicate?.processed_at) {
      return
    }
  }

  if (!order) {
    await markAttemptProcessed(supabase, transId)
    return
  }

  if (order.mpesa_transaction_id === transId) {
    await markAttemptProcessed(supabase, transId)
    return
  }

  if (order.payment_status === "paid") {
    await markAttemptProcessed(supabase, transId)
    return
  }

  const totalAmount = Number(order.total_amount || 0)
  const paidAmount = Number(order.payment_amount_paid || 0)
  const increment = amount && amount > 0 ? amount : 0

  if (increment <= 0) {
    await markAttemptProcessed(supabase, transId)
    return
  }

  const nextPaid = Math.min(totalAmount, paidAmount + increment)
  const nextDue = Math.max(totalAmount - nextPaid, 0)
  const nextStatus: "paid" | "deposit_paid" = nextPaid >= totalAmount ? "paid" : "deposit_paid"

  const updates: Record<string, unknown> = {
    payment_method: "mpesa",
    payment_status: nextStatus,
    payment_amount_paid: nextPaid,
    payment_amount_due: nextDue,
    payment_last_request_amount: null,
    mpesa_transaction_id: transId,
  }

  if (hasValidPhone) {
    updates.mpesa_phone = normalizedPhone
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", order.id)
    .neq("mpesa_transaction_id", transId)
    .select("id")

  if (updateError) {
    console.error(`[${requestId}] [C2B-CONFIRM] Failed to update order:`, updateError.message)
    return
  }

  if (updatedRows?.length) {
    logWithRequestId(requestId, "[C2B-CONFIRM] Order payment advanced", {
      orderId: order.id,
      nextStatus,
      nextPaid,
      nextDue,
    })
  }

  await markAttemptProcessed(supabase, transId)
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const ip = getClientIp(request)

  try {
    const limit = checkRateLimit(`mpesa-c2b-confirm:${ip}`, 300, 60 * 1000)
    if (!limit.allowed) {
      return c2bConfirmationResponse(1, `Rate limit exceeded (${requestId})`)
    }

    const rawBody = await request.text()
    const webhookAuth = verifyWebhookRequest({
      request,
      rawBody,
      sharedSecretEnv: process.env.MPESA_C2B_CALLBACK_SECRET || process.env.MPESA_CALLBACK_SECRET,
      signatureSecretEnv:
        process.env.MPESA_C2B_CALLBACK_HMAC_SECRET || process.env.MPESA_CALLBACK_HMAC_SECRET,
      failClosedInProduction: true,
    })
    if (!webhookAuth.ok) {
      console.warn(`[${requestId}] [C2B-CONFIRM] Webhook auth failed: ${webhookAuth.reason || "unknown"}`)
      return c2bConfirmationResponse(1, "Unauthorized callback")
    }

    const payload = (rawBody ? JSON.parse(rawBody) : {}) as C2BConfirmationPayload
    const transId = String(payload?.TransID || "").trim()
    if (!transId) {
      return c2bConfirmationResponse(1, "TransID is required")
    }

    after(async () => {
      try {
        await processConfirmation(payload, requestId)
      } catch (error) {
        console.error(`[${requestId}] [C2B-CONFIRM] Async processing failed`, error)
      }
    })

    return c2bConfirmationResponse(0, "Accepted")
  } catch (error) {
    console.error(`[${requestId}] [C2B-CONFIRM] Error:`, error)
    return c2bConfirmationResponse(0, "Accepted")
  }
}
