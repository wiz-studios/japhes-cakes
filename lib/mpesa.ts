"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { PAYMENT_CONFIG } from "@/lib/config/payments"
import { Lipana } from "@lipana/sdk"

/**
 * Initiates an M-Pesa STK Push for an existing order using Lipana SDK.
 * - Validates phone number (basic Kenya format).
 * - Generates a NEW unique checkout_request_id per attempt.
 * - Updates the order status to "initiated".
 * - Returns immediately (non-blocking).
 */
export async function initiateMpesaSTK(orderId: string, phone: string) {
    // USE SERVICE ROLE to bypass RLS (Anonymous users can't UPDATE orders directly)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    console.log(`[STK-INIT] Request for Order ${orderId} to ${phone}`)

    // 1. Validate Phone (Basic Kenya validation: starts with 07 or 01, 10 digits)
    // Converting 07XX... to 2547XX... would happen here in a real app
    const phoneRegex = /^(07|01)[0-9]{8}$/
    if (!phoneRegex.test(phone)) {
        console.warn(`[STK-INIT] Invalid phone format: ${phone}`)
        return { success: false, error: "Invalid phone number. Use format 07XXXXXXXX" }
    }

    // 2. Fetch Order Details (Secure Source of Truth for Amount)
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("id", orderId)
        .single()

    if (orderError || !order) {
        console.error(`[STK-INIT] Order lookup failed:`, orderError)
        return { success: false, error: "Order not found" }
    }

    // 3. Initialize Lipana SDK Client
    const environment = (PAYMENT_CONFIG.env === "production" ? "production" : "sandbox") as "sandbox" | "production"

    const lipana = new Lipana({
        apiKey: PAYMENT_CONFIG.lipana.secretKey!,
        environment: environment
    })

    console.log(`[STK-INIT] Initiating STK via SDK (${PAYMENT_CONFIG.env}):`, {
        phone,
        amount: order.total_amount,
        orderId: orderId.slice(0, 8)
    })

    try {
        // 4. Call SDK Method
        const result = await lipana.transactions.initiateStkPush({
            phone: phone,
            amount: order.total_amount,
            accountReference: `Order ${orderId.slice(0, 8)}`,
            transactionDesc: "Payment for order",
        })

        console.log("[STK-INIT] SDK Response:", result)

        // 5. Extract Checkout Request ID (note: SDK uses checkoutRequestID with capital ID)
        const checkoutRequestId =
            (result as any).checkoutRequestID ||
            (result as any).checkoutRequestId ||
            (result as any).checkout_request_id ||
            (result as any).CheckoutRequestID

        if (!checkoutRequestId) {
            console.error("[STK-INIT] No checkoutRequestID in SDK response:", result)
            return { success: false, error: "Invalid response from payment provider" }
        }

        // 6. Update Order
        const { error: updateError } = await supabase
            .from("orders")
            .update({
                payment_status: "initiated",
                mpesa_phone: phone,
                lipana_checkout_request_id: checkoutRequestId,
            })
            .eq("id", orderId)

        if (updateError) {
            console.error(`[STK-INIT] Database update failed:`, updateError)
            return { success: false, error: "Failed to record payment initiation" }
        }

        return { success: true, message: "Payment request sent", checkoutRequestId }

    } catch (err: any) {
        console.error("[STK-INIT] SDK Error:", err)
        return {
            success: false,
            error: err.message || "Internal payment error"
        }
    }
}
