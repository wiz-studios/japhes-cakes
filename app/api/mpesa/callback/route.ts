import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function verifyMpesaCallback(request: Request, payload: any) {
    // Optional shared-secret hardening for webhook sources that support custom headers.
    // Keep backwards compatible when not configured.
    const configuredSecret = process.env.MPESA_CALLBACK_SECRET?.trim()
    if (configuredSecret) {
        const receivedSecret =
            request.headers.get("x-webhook-secret") ||
            request.headers.get("x-callback-secret")

        if (!receivedSecret || receivedSecret !== configuredSecret) {
            return false
        }
    }

    // Basic payload shape validation to reject malformed spoof requests.
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

export async function POST(request: Request) {
    try {
        const payload = await request.json()
        console.log("[STK-CALLBACK] Received callback payload")

        if (!verifyMpesaCallback(request, payload)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        // Daraja payload: Body.stkCallback.*
        const darajaCb = payload?.Body?.stkCallback
        const checkoutRequestId = darajaCb?.CheckoutRequestID || payload.checkoutRequestId
        const resultCode = typeof darajaCb?.ResultCode === "number" ? darajaCb.ResultCode : payload.resultCode
        const resultDesc = darajaCb?.ResultDesc || payload.resultDesc
        const merchantRequestId = darajaCb?.MerchantRequestID || payload.merchantRequestId

        let mpesaReceiptNumber: string | undefined
        let callbackAmount: number | undefined
        let callbackPhone: string | undefined
        const items = darajaCb?.CallbackMetadata?.Item || []
        for (const item of items) {
            if (item?.Name === "MpesaReceiptNumber") mpesaReceiptNumber = item.Value
            if (item?.Name === "Amount") callbackAmount = Number(item.Value)
            if (item?.Name === "PhoneNumber") callbackPhone = String(item.Value)
        }

        if (!checkoutRequestId) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 })
        }

        // USE SERVICE ROLE: Callbacks are anonymous/external, must bypass RLS to read/update orders
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )

        // Replay guard (receipt-based)
        if (mpesaReceiptNumber) {
            const { data: existingReceipt } = await supabase
                .from("payment_attempts")
                .select("processed_at")
                .eq("mpesa_receipt", mpesaReceiptNumber)
                .maybeSingle()

            if (existingReceipt?.processed_at) {
                return NextResponse.json({ received: true })
            }
        }

        // 1. Find Order by Checkout ID
        const { data: order, error: findError } = await supabase
            .from("orders")
            .select("id, mpesa_checkout_request_id, payment_status, payment_plan, total_amount, payment_amount_paid, payment_deposit_amount, payment_last_request_amount")
            .eq("mpesa_checkout_request_id", checkoutRequestId)
            .single()

        // 1b. Store callback attempt (audit trail)
        const attemptPayload = {
            order_id: order?.id ?? null,
            checkout_request_id: checkoutRequestId || null,
            merchant_request_id: merchantRequestId || null,
            mpesa_receipt: mpesaReceiptNumber || null,
            result_code: typeof resultCode === "number" ? resultCode : null,
            result_desc: resultDesc || null,
            amount: typeof callbackAmount === "number" && Number.isFinite(callbackAmount) ? callbackAmount : null,
            phone: callbackPhone || null,
            status: resultCode === 0 ? "success" : "failed",
            raw_payload: payload,
        }

        const { error: attemptError } = await supabase
            .from("payment_attempts")
            .insert(attemptPayload)

        if (attemptError?.code === "23505") {
            if (mpesaReceiptNumber) {
                const { data: existingByReceipt } = await supabase
                    .from("payment_attempts")
                    .select("processed_at")
                    .eq("mpesa_receipt", mpesaReceiptNumber)
                    .maybeSingle()

                if (existingByReceipt) {
                    return NextResponse.json({ received: true })
                }
            }

            const { data: existingAttempt } = await supabase
                .from("payment_attempts")
                .select("processed_at")
                .eq("checkout_request_id", checkoutRequestId)
                .maybeSingle()

            if (existingAttempt?.processed_at) {
                return NextResponse.json({ received: true })
            }
        }

        if (findError || !order) {
            console.warn(`[STK-CALLBACK] Ignored: Order not found for ID ${checkoutRequestId}`)
            // Return 200 to acknowledge Safaricom, even if we can't process
            return NextResponse.json({ received: true })
        }

        // 2. Idempotency Check (STRICT)
        // If exact ID matches, we authorize processing.
        // If order is already paid, we generally don't want to revert it to failed 
        // BUT we must allow duplicate SUCCESS callbacks to be harmless.
        if (order.payment_status === "paid") {
            console.log(`[STK-CALLBACK] Order ${order.id} already paid. Ignoring callback.`)
            return NextResponse.json({ received: true })
        }

        // 3. Process Status
        if (resultCode === 0) {
            // SUCCESS
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

            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    payment_status: nextStatus,
                    payment_amount_paid: nextPaid,
                    payment_amount_due: nextDue,
                    payment_last_request_amount: null,
                    mpesa_transaction_id: mpesaReceiptNumber || payload.mpesaReceiptNumber || "MOCK_TRX_" + Date.now()
                })
                .eq("id", order.id)

            if (updateError) {
                console.error(`[STK-CALLBACK] DB Update Failed: ${updateError.message}`)
                return NextResponse.json({ error: "Internal Error" }, { status: 500 })
            }
            await supabase
                .from("payment_attempts")
                .update({ processed_at: new Date().toISOString() })
                .eq("checkout_request_id", checkoutRequestId)
            console.log(`[STK-CALLBACK] Order ${order.id} marked ${nextStatus}.`)

        } else {
            // FAILURE
            // Only set to failed if currently "initiated" or "pending"
            // Assuming we are the active request because we matched the checkout Request ID exactly.
            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    payment_status: "failed",
                })
                .eq("id", order.id)

            await supabase
                .from("payment_attempts")
                .update({ processed_at: new Date().toISOString() })
                .eq("checkout_request_id", checkoutRequestId)
            console.log(`[STK-CALLBACK] Order ${order.id} marked FAILED: ${resultDesc}`)
        }

        return NextResponse.json({ received: true })

    } catch (err) {
        console.error("[STK-CALLBACK] Error:", err)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
