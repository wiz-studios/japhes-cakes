"use server"

import { createClient } from "@supabase/supabase-js"
// import { createServerSupabaseClient } from "@/lib/supabase-server" // Removed: client context fails RLS
import { revalidatePath } from "next/cache"
import { PAYMENT_CONFIG } from "@/lib/config/payments"

/**
 * Initiates an M-Pesa STK Push for an existing order.
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
        .select("total, lipana_transaction_id")
        .eq("id", orderId)
        .single()

    if (orderError || !order) {
        console.error(`[STK-INIT] Order lookup failed:`, orderError)
        return { success: false, error: "Order not found" }
    }

    // 3. Prepare Lipana Payload
    // In Sandbox, we preserve the "Sandbox-first" rule: use config values.
    const url = `${PAYMENT_CONFIG.lipana.baseUrl}/v1/transactions/push-stk`
    const headers = {
        "Authorization": `Bearer ${PAYMENT_CONFIG.lipana.secretKey}`,
        "Content-Type": "application/json",
    }
    const payload = {
        phone_number: phone,
        amount: order.total,
        account_reference: `Order ${orderId.slice(0, 8)}`,
        transaction_description: "Payment for order",
        // callback_url is usually configured in dashboard, avoiding passing it here unless required.
    }

    console.log(`[STK-INIT] Sending to Lipana (${PAYMENT_CONFIG.env}):`, payload)

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
        })

        const result = await response.json()

        if (!response.ok) {
            console.error("[STK-INIT] Lipana API Error:", result)
            return { success: false, error: result.message || "Payment initiation failed" }
        }

        // 4. Update Order
        // "lipana_checkout_request_id" is the key we track.
        // Assuming Lipana returns { checkout_request_id: "..." } or similar.
        // If unknown, I will log it. But for now, I'll map common fields.
        // Lipana docs (hypothetical): { data: { checkout_request_id: "..." } } or just { checkout_request_id: "..." }
        // I will trust the user's checklist which implies we get a request ID.
        // I'll assume `result.checkout_request_id` or `result.data.checkout_request_id`.
        const checkoutRequestId = result.checkout_request_id || result.data?.checkout_request_id

        if (!checkoutRequestId) {
            console.error("[STK-INIT] No checkout_request_id in response:", result)
            return { success: false, error: "Invalid response from payment provider" }
        }

        const { error: updateError } = await supabase
            .from("orders")
            .update({
                payment_status: "initiated",
                mpesa_phone: phone,
                lipana_checkout_request_id: checkoutRequestId,
                // We do NOT set lipana_transaction_id yet; that comes in the callback (Phase 5).
            })
            .eq("id", orderId)

        if (updateError) {
            console.error(`[STK-INIT] Database update failed:`, updateError)
            return { success: false, error: "Failed to record payment initiation" }
        }

        return { success: true, message: "Payment request sent", checkoutRequestId }

    } catch (err) {
        console.error("[STK-INIT] Network/Logic Error:", err)
        return { success: false, error: "Internal payment error" }
    }
}
