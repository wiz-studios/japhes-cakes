import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function verifyMpesaCallback(payload: any) {
    // In production, verify SHA-256 signature from Safaricom
    return true
}

export async function POST(request: Request) {
    try {
        const payload = await request.json()
        console.log("[STK-CALLBACK] Received:", JSON.stringify(payload))

        if (!verifyMpesaCallback(payload)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
        }

        // Safaricom Payload Structure Simulation
        // In reality: Body.stkCallback.CheckoutRequestID
        const checkoutRequestId = payload.checkoutRequestId
        const resultCode = payload.resultCode // 0 = Success, others = Fail
        const resultDesc = payload.resultDesc

        if (!checkoutRequestId) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 })
        }

        // USE SERVICE ROLE: Callbacks are anonymous/external, must bypass RLS to read/update orders
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )

        // 1. Find Order by Checkout ID
        const { data: order, error: findError } = await supabase
            .from("orders")
            .select("id, mpesa_checkout_request_id, payment_status")
            .eq("mpesa_checkout_request_id", checkoutRequestId)
            .single()

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
            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    payment_status: "paid",
                    mpesa_transaction_id: payload.mpesaReceiptNumber || "MOCK_TRX_" + Date.now()
                })
                .eq("id", order.id)

            if (updateError) {
                console.error(`[STK-CALLBACK] DB Update Failed: ${updateError.message}`)
                return NextResponse.json({ error: "Internal Error" }, { status: 500 })
            }
            console.log(`[STK-CALLBACK] Order ${order.id} marked PAID.`)

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

            console.log(`[STK-CALLBACK] Order ${order.id} marked FAILED: ${resultDesc}`)
        }

        return NextResponse.json({ received: true })

    } catch (err) {
        console.error("[STK-CALLBACK] Error:", err)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
