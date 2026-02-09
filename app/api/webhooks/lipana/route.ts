import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import crypto from "crypto"
import { PAYMENT_CONFIG } from "@/lib/config/payments"
import { isValidPaymentTransition } from "@/lib/payment-rules"

// Verify signature (Standard HMAC SHA256)
function verifySignature(payload: string, signature: string | null) {
    const secret = PAYMENT_CONFIG.lipana.webhookSecret
    if (!secret) return false
    if (!signature) return false

    const hmac = crypto.createHmac("sha256", secret)
    const digest = hmac.update(payload).digest("hex")

    return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(digest, 'utf8')
    )
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text()
        const signature = request.headers.get("X-Lipana-Signature") || request.headers.get("Signature")

        console.log(`[LIPANA-WEBHOOK] Received (${PAYMENT_CONFIG.env}):`, rawBody.substring(0, 100) + "...")

        // 1. Signature Verification
        if (!verifySignature(rawBody, signature)) {
            console.error("[LIPANA-WEBHOOK] Invalid signature")
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        const payload = JSON.parse(rawBody)
        const eventType = payload.Type || payload.event || payload.type
        const data = payload.Data || payload.data

        // 2. Validate Data
        const checkoutRequestId =
            data?.checkout_request_id ||
            data?.checkoutRequestId ||
            data?.CheckoutRequestID ||
            data?.checkoutRequestID

        if (!checkoutRequestId) {
            console.error("[LIPANA-WEBHOOK] Missing checkout_request_id")
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
        }

        // 3. Initialize Admin Supabase Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )

        // 4. Find Order (Idempotency)
        const { data: order, error: findError } = await supabase
            .from("orders")
            .select("id, lipana_checkout_request_id, payment_status, payment_plan, total_amount, payment_amount_paid, payment_deposit_amount, payment_last_request_amount")
            .eq("lipana_checkout_request_id", checkoutRequestId)
            .single()

        if (findError || !order) {
            console.warn(`[LIPANA-WEBHOOK] Order not found for req ID: ${checkoutRequestId}`)
            return NextResponse.json({ received: true })
        }

        // 5. Determine Target Status
        const isSuccess = eventType === "payment.success" || eventType === "Success" || data?.ResultCode === 0
        const isFailed = eventType === "payment.failed" || eventType === "payment.cancelled" || (data?.ResultCode && data?.ResultCode !== 0)

        const targetStatus = isSuccess
            ? (order.payment_plan === "deposit" && order.payment_status !== "deposit_paid" ? "deposit_paid" : "paid")
            : isFailed ? "failed" : null

        if (!targetStatus) {
            console.warn(`[LIPANA-WEBHOOK] Unhandled event type/status: ${eventType}`)
            return NextResponse.json({ received: true })
        }

        // 6. Strict Transition Validation
        if (!isValidPaymentTransition(order.payment_status, targetStatus)) {
            console.error(`[LIPANA-WEBHOOK] INVALID TRANSITION: ${order.payment_status} -> ${targetStatus}. Order: ${order.id}`)
            return NextResponse.json({ received: true })
        }

        // 7. Process Update
        if (targetStatus === "paid") {
            const transactionId = data?.transaction_reference || data?.MpesaReceiptNumber || "LIPANA_TRX_" + Date.now()
            const totalAmount = Number(order.total_amount || 0)
            const paidAmount = Number(order.payment_amount_paid || 0)
            const depositAmount = Number(order.payment_deposit_amount || Math.ceil(totalAmount * 0.5))
            const requestAmount = Number(order.payment_last_request_amount || 0)

            // Idempotency: ignore duplicate deposit callbacks
            if (order.payment_status === "deposit_paid" && requestAmount <= depositAmount) {
                return NextResponse.json({ received: true })
            }

            const increment = requestAmount || (order.payment_plan === "deposit" && paidAmount < totalAmount ? depositAmount : totalAmount)
            const nextPaid = Math.min(totalAmount, paidAmount + increment)
            const nextDue = Math.max(totalAmount - nextPaid, 0)
            const nextStatus: "paid" | "deposit_paid" = nextPaid >= totalAmount ? "paid" : "deposit_paid"

            const updatePayload: any = {
                payment_status: nextStatus,
                lipana_transaction_id: transactionId,
                mpesa_transaction_id: transactionId,
                payment_amount_paid: nextPaid,
                payment_amount_due: nextDue,
                payment_last_request_amount: null,
            }

            if (nextStatus === "paid") {
                updatePayload.paid_at = new Date().toISOString()
            }

            const { error: updateError } = await supabase
                .from("orders")
                .update(updatePayload)
                .eq("id", order.id)

            if (updateError) throw updateError
            console.log(`[LIPANA-WEBHOOK] Order ${order.id} marked PAID`)

        } else if (targetStatus === "failed") {
            const { error: updateError } = await supabase
                .from("orders")
                .update({ payment_status: "failed" })
                .eq("id", order.id)

            if (updateError) console.error(`[LIPANA-WEBHOOK] Update failed: ${updateError.message}`)
            console.log(`[LIPANA-WEBHOOK] Order ${order.id} marked FAILED`)
        }

        return NextResponse.json({ received: true })

    } catch (err) {
        console.error("[LIPANA-WEBHOOK] Internal Error:", err)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
