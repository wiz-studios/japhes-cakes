"use server"

import { createClient } from "@supabase/supabase-js"
// import { createServerSupabaseClient } from "@/lib/supabase-server" // Removed: client context fails RLS
import { revalidatePath } from "next/cache"

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

    // 2. Mock STK Push - Generate new ID
    // In production, this comes from Safaricom's API response
    const newCheckoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(2, 12).toUpperCase()}`

    // 3. Update Order - Source of Truth
    // We overwrite any previous request ID. Only the latest one is valid.
    const { error } = await supabase
        .from("orders")
        .update({
            payment_status: "initiated",
            mpesa_phone: phone,
            mpesa_checkout_request_id: newCheckoutRequestId,
            // Clear any previous transaction ID if retrying? Maybe not strict requirement but good practice.
            // But keeping history might be useful. For now, we focus on the request ID.
        })
        .eq("id", orderId)

    if (error) {
        console.error(`[STK-INIT] Database update failed:`, error)
        return { success: false, error: `DB Error: ${error.message}` }
    }

    console.log(`[STK-INIT] Success. New Req ID: ${newCheckoutRequestId}`)

    // 4. Return success immediately
    return { success: true, message: "Payment request sent", checkoutRequestId: newCheckoutRequestId }
}
