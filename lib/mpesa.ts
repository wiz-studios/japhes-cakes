"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { isValidKenyaPhone, normalizeKenyaPhone } from "@/lib/phone"

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

    // 1. Validate Phone (Kenya format: 07/01, 10 digits)
    const normalizedPhone = normalizeKenyaPhone(phone)
    if (!isValidKenyaPhone(normalizedPhone)) {
        console.warn(`[STK-INIT] Invalid phone format: ${phone}`)
        return { success: false, error: "Invalid phone number. Use 07XXXXXXXX or 01XXXXXXXX" }
    }

    // 2. Fetch Order Details (Secure Source of Truth for Amount)
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("phone, total_amount, payment_plan, payment_amount_paid, payment_deposit_amount, payment_status, payment_last_request_amount")
        .eq("id", orderId)
        .single()

    if (orderError || !order) {
        console.error(`[STK-INIT] Order lookup failed:`, orderError)
        return { success: false, error: "Order not found" }
    }

    // Prevent triggering STK for a different order's phone.
    const orderPhone = normalizeKenyaPhone(order.phone || "")
    if (!orderPhone || orderPhone !== normalizedPhone) {
        return { success: false, error: "Phone does not match this order." }
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
        amountToCharge = order.payment_status === "deposit_paid"
            ? Math.max(totalAmount - paidAmount, 0)
            : depositAmount
    }

    if (amountToCharge <= 0) {
        return { success: false, error: "No balance due" }
    }

    // Daraja integration will replace Lipana. For now, we return a clear message.
    return {
        success: false,
        error: "M-Pesa is being migrated to Daraja. Please try again after the Daraja setup is complete."
    }
}
