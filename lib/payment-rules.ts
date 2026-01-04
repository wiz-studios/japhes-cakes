import type { PaymentMethod, PaymentStatus, Fulfilment, Order, UserRole } from "./types/payment"

/**
 * Determines initial payment status based on payment method and fulfilment type
 */
export function getInitialPaymentStatus(
    paymentMethod: PaymentMethod,
    fulfilment: Fulfilment
): PaymentStatus {
    if (paymentMethod === "mpesa") {
        return "pending"
    }

    return fulfilment === "delivery" ? "pay_on_delivery" : "pay_on_pickup"
}

/**
 * Checks if an order requires payment before kitchen can prepare
 */
export function requiresPaymentBeforePreparation(order: Order): boolean {
    return (
        order.fulfilment === "delivery" &&
        order.payment_method === "mpesa" &&
        order.payment_status !== "paid"
    )
}

/**
 * Validates if an order can progress to a new status based on User Role & Business Rules
 */
export function canProgressToStatus(
    order: Order,
    newStatus: string,
    actorRole: UserRole
): { allowed: boolean; reason?: string } {
    // 1. ADMIN OVERRIDE
    // Admins can do anything valid (state machine validation happens in action)
    if (actorRole === "admin") return { allowed: true }

    // 2. KITCHEN STAFF RULES
    if (actorRole === "kitchen") {
        // Allowed actions: "in_kitchen", "ready_for_pickup"
        // Forbidden: "out_for_delivery", "delivered"
        if (["out_for_delivery", "delivered"].includes(newStatus)) {
            return { allowed: false, reason: "Kitchen staff cannot dispatch deliveries" }
        }

        // STRICT PAYMENT LOCK: Cannot start/finish prep if unpaid M-Pesa Delivery
        const preparationStatuses = ["preparing", "in_kitchen", "ready_for_pickup"]
        if (preparationStatuses.includes(newStatus)) {
            if (requiresPaymentBeforePreparation(order)) {
                return {
                    allowed: false,
                    reason: "STRICT LOCK: Delivery orders with M-Pesa payment must be paid before preparation"
                }
            }
        }

        return { allowed: true }
    }

    // 3. DELIVERY STAFF RULES
    if (actorRole === "delivery") {
        // Allowed: "out_for_delivery", "delivered"
        // Forbidden: "in_kitchen", "ready_for_pickup"
        if (["in_kitchen", "preparing", "ready_for_pickup"].includes(newStatus)) {
            return { allowed: false, reason: "Delivery staff cannot prepare food" }
        }

        // Delivery staff can only update if order is ready
        if (newStatus === "out_for_delivery" && order.status !== "ready_for_pickup") {
            return { allowed: false, reason: "Order must be Ready for Pickup before delivery" }
        }

        return { allowed: true }
    }

    // Default deny for unknown roles
    return { allowed: false, reason: "Unauthorized role" }
}

/**
 * Gets user-friendly payment status message
 */
export function getPaymentStatusMessage(
    paymentStatus: PaymentStatus,
    fulfilment: Fulfilment
): string {
    switch (paymentStatus) {
        case "pending":
            return "Payment Pending"
        case "initiated":
            return "Payment Initiated"
        case "paid":
            return "Payment Received"
        case "pay_on_delivery":
            return "Pay on Delivery"
        case "pay_on_pickup":
            return "Pay on Pickup"
        case "failed":
            return "Payment Failed"
        default:
            return "Unknown"
    }
}

/**
 * Gets payment instruction for user
 */
export function getPaymentInstruction(
    paymentMethod: PaymentMethod,
    fulfilment: Fulfilment,
    paymentStatus: PaymentStatus
): string {
    if (paymentMethod === "cash") {
        return fulfilment === "delivery"
            ? "Payment will be collected when your order is delivered."
            : "Payment will be made when you collect your order."
    }

    if (paymentStatus === "pending") {
        return "Please complete M-Pesa payment to confirm your order."
    }

    if (paymentStatus === "initiated") {
        return "Check your phone for the M-Pesa STK prompt."
    }

    if (paymentStatus === "paid") {
        return "Payment confirmed. Thank you!"
    }

    return ""
}
