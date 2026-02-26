import { createServiceSupabaseClient } from "@/lib/supabase-service"
import { queryDarajaStkPushStatus, type DarajaStkQueryResponse } from "@/lib/mpesa-daraja"
import { sendAdminPaymentAlert } from "@/lib/admin-payment-alert"

type ReconcileState = "success" | "failed" | "pending"

type OrderRow = {
  id: string
  friendly_id: string | null
  customer_name: string | null
  phone: string | null
  mpesa_phone: string | null
  created_at: string
  payment_status: string | null
  payment_plan: string | null
  total_amount: number | string | null
  payment_amount_paid: number | string | null
  payment_amount_due: number | string | null
  payment_deposit_amount: number | string | null
  payment_last_request_amount: number | string | null
  mpesa_checkout_request_id: string | null
  mpesa_transaction_id: string | null
}

type PaymentLedgerRow = {
  id: string
  amount: number | string | null
  status: string | null
  mpesa_transaction_id: string | null
}

type ReconcileStats = {
  scanned: number
  queried: number
  advanced: number
  alreadyPaid: number
  markedFailed: number
  pending: number
  errors: number
  skipped: number
}

type ReconcileResult = {
  success: boolean
  requestId: string
  batchSize: number
  lookbackMinutes: number
  stats: ReconcileStats
}

type ReconcileOptions = {
  requestId: string
  batchSize?: number
  lookbackMinutes?: number
}

const ORDER_RECONCILE_SELECT =
  "id, friendly_id, customer_name, phone, mpesa_phone, created_at, payment_status, payment_plan, total_amount, payment_amount_paid, payment_amount_due, payment_deposit_amount, payment_last_request_amount, mpesa_checkout_request_id, mpesa_transaction_id"

const PENDING_KEYWORDS = [
  "being processed",
  "still processing",
  "in progress",
  "processing request",
  "queued",
]

function toSafeNumber(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isMissingTable(error: any) {
  const message = String(error?.message || "").toLowerCase()
  return error?.code === "42P01" || message.includes("does not exist")
}

function getBatchSize(override?: number) {
  const raw = Number(override ?? process.env.MPESA_RECONCILE_BATCH_SIZE ?? 25)
  if (!Number.isFinite(raw)) return 25
  return clamp(Math.floor(raw), 1, 100)
}

function getLookbackMinutes(override?: number) {
  const raw = Number(override ?? process.env.MPESA_RECONCILE_LOOKBACK_MINUTES ?? 360)
  if (!Number.isFinite(raw)) return 360
  return clamp(Math.floor(raw), 10, 24 * 60)
}

function parseResultCode(payload: DarajaStkQueryResponse): number | null {
  const raw = payload.ResultCode
  if (raw === null || raw === undefined || raw === "") return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function classifyStkQuery(payload: DarajaStkQueryResponse): {
  state: ReconcileState
  resultCode: number | null
  resultDesc: string
} {
  const resultCode = parseResultCode(payload)
  const resultDesc = String(
    payload.ResultDesc || payload.ResponseDescription || payload.errorMessage || "No description"
  ).trim()
  const lowered = resultDesc.toLowerCase()
  const isPendingByText = PENDING_KEYWORDS.some((phrase) => lowered.includes(phrase))

  if (resultCode === 0) return { state: "success", resultCode, resultDesc }
  if (isPendingByText) return { state: "pending", resultCode, resultDesc }
  if (resultCode === null) return { state: "pending", resultCode, resultDesc }
  return { state: "failed", resultCode, resultDesc }
}

async function getPaymentLedgerByCheckout(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  checkoutRequestId: string
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, status, mpesa_transaction_id")
    .eq("mpesa_checkout_request_id", checkoutRequestId)
    .maybeSingle()

  if (error) {
    if (isMissingTable(error)) return null
    throw error
  }

  return (data as PaymentLedgerRow | null) || null
}

async function upsertPaymentLedger(params: {
  supabase: ReturnType<typeof createServiceSupabaseClient>
  orderId: string
  checkoutRequestId: string
  amount: number | null
  status: "initiated" | "success" | "failed"
  transactionId: string | null
}) {
  const { supabase, orderId, checkoutRequestId, amount, status, transactionId } = params

  const { error } = await supabase.from("payments").upsert(
    {
      order_id: orderId,
      amount,
      method: "mpesa",
      status,
      mpesa_checkout_request_id: checkoutRequestId,
      mpesa_transaction_id: transactionId,
    },
    { onConflict: "mpesa_checkout_request_id" }
  )

  if (error && !isMissingTable(error)) {
    throw error
  }
}

async function upsertPaymentAttempt(params: {
  supabase: ReturnType<typeof createServiceSupabaseClient>
  order: OrderRow
  checkoutRequestId: string
  amount: number | null
  classification: { state: ReconcileState; resultCode: number | null; resultDesc: string }
  payload: DarajaStkQueryResponse
}) {
  const { supabase, order, checkoutRequestId, amount, classification, payload } = params

  const attemptPayload = {
    order_id: order.id,
    checkout_request_id: checkoutRequestId,
    merchant_request_id: payload.MerchantRequestID || null,
    mpesa_receipt: order.mpesa_transaction_id || null,
    result_code: classification.resultCode,
    result_desc: classification.resultDesc,
    amount,
    phone: order.mpesa_phone || order.phone || null,
    status: classification.state,
    processed_at: classification.state === "pending" ? null : new Date().toISOString(),
    raw_payload: {
      source: "cron_stk_query_reconcile",
      data: payload,
    },
  }

  const { data: existing, error: existingError } = await supabase
    .from("payment_attempts")
    .select("id")
    .eq("checkout_request_id", checkoutRequestId)
    .maybeSingle()

  if (existingError) {
    if (isMissingTable(existingError)) return
    throw existingError
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("payment_attempts")
      .update(attemptPayload)
      .eq("id", existing.id)

    if (updateError && !isMissingTable(updateError)) {
      throw updateError
    }
    return
  }

  const { error: insertError } = await supabase.from("payment_attempts").insert(attemptPayload)
  if (insertError?.code === "23505") {
    const { error: retryUpdateError } = await supabase
      .from("payment_attempts")
      .update(attemptPayload)
      .eq("checkout_request_id", checkoutRequestId)
    if (retryUpdateError && !isMissingTable(retryUpdateError)) {
      throw retryUpdateError
    }
    return
  }

  if (insertError && !isMissingTable(insertError)) {
    throw insertError
  }
}

function getAmountToApply(order: OrderRow, ledgerAmount: number | null) {
  const totalAmount = Math.max(toSafeNumber(order.total_amount), 0)
  const paidAmount = Math.max(toSafeNumber(order.payment_amount_paid), 0)
  const remaining = Math.max(totalAmount - paidAmount, 0)
  const depositAmount = Math.max(
    toSafeNumber(order.payment_deposit_amount) || Math.ceil(totalAmount * 0.5),
    0
  )
  const requestAmount = Math.max(toSafeNumber(order.payment_last_request_amount), 0)
  const ledger = Math.max(toSafeNumber(ledgerAmount), 0)

  const fallbackAmount =
    order.payment_plan === "deposit" && paidAmount <= 0 ? depositAmount : remaining

  const suggested = ledger || requestAmount || fallbackAmount
  const increment = remaining > 0 ? Math.min(remaining, suggested > 0 ? suggested : remaining) : 0

  return {
    totalAmount,
    paidAmount,
    remaining,
    increment,
  }
}

export async function reconcileMpesaPayments(options: ReconcileOptions): Promise<ReconcileResult> {
  const batchSize = getBatchSize(options.batchSize)
  const lookbackMinutes = getLookbackMinutes(options.lookbackMinutes)
  const cutoffIso = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString()
  const supabase = createServiceSupabaseClient()
  const stats: ReconcileStats = {
    scanned: 0,
    queried: 0,
    advanced: 0,
    alreadyPaid: 0,
    markedFailed: 0,
    pending: 0,
    errors: 0,
    skipped: 0,
  }

  const { data: rows, error } = await supabase
    .from("orders")
    .select(ORDER_RECONCILE_SELECT)
    .in("payment_status", ["initiated", "pending", "deposit_paid"])
    .not("mpesa_checkout_request_id", "is", null)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: true })
    .limit(batchSize)

  if (error) {
    throw error
  }

  const orders = (rows as OrderRow[] | null) || []
  for (const order of orders) {
    stats.scanned += 1

    const checkoutRequestId = String(order.mpesa_checkout_request_id || "").trim()
    if (!checkoutRequestId) {
      stats.skipped += 1
      continue
    }

    // For deposit-paid orders, reconcile only when a balance STK request is currently active.
    if ((order.payment_status || "").toLowerCase() === "deposit_paid") {
      const lastRequestedAmount = Math.max(toSafeNumber(order.payment_last_request_amount), 0)
      if (lastRequestedAmount <= 0) {
        stats.skipped += 1
        continue
      }
    }

    let ledgerRow: PaymentLedgerRow | null = null
    try {
      ledgerRow = await getPaymentLedgerByCheckout(supabase, checkoutRequestId)
    } catch (lookupError) {
      console.error(
        `[${options.requestId}] [MPESA-RECONCILE] Failed to read payments ledger`,
        checkoutRequestId,
        lookupError
      )
      stats.errors += 1
      continue
    }

    let queryPayload: DarajaStkQueryResponse
    try {
      queryPayload = await queryDarajaStkPushStatus({ checkoutRequestId })
      stats.queried += 1
    } catch (queryError) {
      console.error(
        `[${options.requestId}] [MPESA-RECONCILE] Daraja query failed`,
        checkoutRequestId,
        queryError
      )
      stats.errors += 1
      continue
    }

    const classification = classifyStkQuery(queryPayload)
    const amountHint = Math.max(
      toSafeNumber(ledgerRow?.amount) || toSafeNumber(order.payment_last_request_amount),
      0
    )

    try {
      if (classification.state === "success") {
        const { totalAmount, paidAmount, remaining, increment } = getAmountToApply(order, toSafeNumber(ledgerRow?.amount))

        const appliedIncrement = remaining > 0 ? increment : 0
        const nextPaid = Math.min(totalAmount, paidAmount + appliedIncrement)
        const nextDue = Math.max(totalAmount - nextPaid, 0)
        const nextStatus: "paid" | "deposit_paid" = nextPaid >= totalAmount ? "paid" : "deposit_paid"
        const transactionId =
          order.mpesa_transaction_id ||
          ledgerRow?.mpesa_transaction_id ||
          `STKQ_${Date.now().toString(36)}`

        const updatePayload: Record<string, unknown> = {
          payment_status: nextStatus,
          payment_amount_paid: nextPaid,
          payment_amount_due: nextDue,
          payment_last_request_amount: null,
          mpesa_transaction_id: transactionId,
        }

        const { data: updated, error: updateError } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", order.id)
          .neq("payment_status", "paid")
          .select("id")

        if (updateError) throw updateError

        await upsertPaymentLedger({
          supabase,
          orderId: order.id,
          checkoutRequestId,
          amount: appliedIncrement || amountHint || null,
          status: "success",
          transactionId,
        })

        await upsertPaymentAttempt({
          supabase,
          order,
          checkoutRequestId,
          amount: appliedIncrement || amountHint || null,
          classification,
          payload: queryPayload,
        })

        if (updated?.length) {
          stats.advanced += 1

          if (appliedIncrement > 0) {
            await sendAdminPaymentAlert({
              source: "stk",
              requestId: options.requestId,
              orderId: order.id,
              friendlyId: order.friendly_id,
              customerName: order.customer_name,
              contactPhone: order.mpesa_phone || order.phone,
              paymentStatus: nextStatus,
              amountReceived: appliedIncrement,
              totalAmount,
              totalPaid: nextPaid,
              balanceDue: nextDue,
              transactionId,
              checkoutRequestId,
            })
          }
        } else {
          stats.alreadyPaid += 1
        }
      } else if (classification.state === "failed") {
        const currentStatus = String(order.payment_status || "").toLowerCase()
        const failureUpdate: Record<string, unknown> = {
          payment_last_request_amount: null,
        }

        if (currentStatus === "initiated" || currentStatus === "pending") {
          failureUpdate.payment_status = "failed"
        }

        const { error: orderFailureError } = await supabase.from("orders").update(failureUpdate).eq("id", order.id)
        if (orderFailureError) throw orderFailureError

        await upsertPaymentLedger({
          supabase,
          orderId: order.id,
          checkoutRequestId,
          amount: amountHint || null,
          status: "failed",
          transactionId: order.mpesa_transaction_id || ledgerRow?.mpesa_transaction_id || null,
        })

        await upsertPaymentAttempt({
          supabase,
          order,
          checkoutRequestId,
          amount: amountHint || null,
          classification,
          payload: queryPayload,
        })

        stats.markedFailed += 1
      } else {
        const currentStatus = String(order.payment_status || "").toLowerCase()
        if (currentStatus === "pending") {
          const { error: pendingUpdateError } = await supabase
            .from("orders")
            .update({ payment_status: "initiated" })
            .eq("id", order.id)
            .eq("payment_status", "pending")
          if (pendingUpdateError) throw pendingUpdateError
        }

        await upsertPaymentLedger({
          supabase,
          orderId: order.id,
          checkoutRequestId,
          amount: amountHint || null,
          status: "initiated",
          transactionId: order.mpesa_transaction_id || ledgerRow?.mpesa_transaction_id || null,
        })

        await upsertPaymentAttempt({
          supabase,
          order,
          checkoutRequestId,
          amount: amountHint || null,
          classification,
          payload: queryPayload,
        })

        stats.pending += 1
      }
    } catch (reconcileError) {
      console.error(
        `[${options.requestId}] [MPESA-RECONCILE] Failed to reconcile checkout`,
        checkoutRequestId,
        reconcileError
      )
      stats.errors += 1
    }
  }

  return {
    success: true,
    requestId: options.requestId,
    batchSize,
    lookbackMinutes,
    stats,
  }
}
