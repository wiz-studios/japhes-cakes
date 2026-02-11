"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { PAYMENT_CONFIG } from "@/lib/config/payments"
import { Lipana } from "@lipana/sdk"
import { isValidKenyaPhone, normalizeKenyaPhone, toKenyaMsisdn } from "@/lib/phone"

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
    const msisdn = toKenyaMsisdn(normalizedPhone)
    if (!msisdn) {
        return { success: false, error: "Invalid phone number. Use 07XXXXXXXX or 01XXXXXXXX" }
    }

    // 2. Fetch Order Details (Secure Source of Truth for Amount)
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("total_amount, payment_plan, payment_amount_paid, payment_deposit_amount, payment_status, payment_last_request_amount")
        .eq("id", orderId)
        .single()

    if (orderError || !order) {
        console.error(`[STK-INIT] Order lookup failed:`, orderError)
        return { success: false, error: "Order not found" }
    }

    // 3. Initialize Lipana SDK Client
    const environment = (PAYMENT_CONFIG.env === "production" ? "production" : "sandbox") as "sandbox" | "production"

    const baseUrl = PAYMENT_CONFIG.lipana.baseUrl
    const normalizedBaseUrl = baseUrl
        ? (baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl.replace(/\/+$/, "")}/v1`)
        : undefined

    const lipana = new Lipana({
        apiKey: PAYMENT_CONFIG.lipana.secretKey!,
        environment: environment,
        ...(normalizedBaseUrl ? { baseUrl: normalizedBaseUrl } : {})
    })

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

    console.log(`[STK-INIT] Initiating STK via SDK (${PAYMENT_CONFIG.env}):`, {
        phone: msisdn,
        amount: amountToCharge,
        orderId: orderId.slice(0, 8),
        baseUrl: normalizedBaseUrl || "SDK default"
    })

    try {
        // 4. Call SDK Method
        const result = await lipana.transactions.initiateStkPush({
            phone: msisdn,
            amount: amountToCharge,
            accountReference: PAYMENT_CONFIG.lipana.paybillAccount,
            transactionDesc: `Order ${orderId.slice(0, 8)} - Paybill ${PAYMENT_CONFIG.lipana.paybillNumber}`,
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
                mpesa_phone: normalizedPhone,
                lipana_checkout_request_id: checkoutRequestId,
                payment_last_request_amount: amountToCharge,
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
