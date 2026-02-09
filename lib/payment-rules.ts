import type { PaymentMethod, PaymentStatus, Fulfilment, Order, UserRole, PaymentPlan } from "./types/payment"

/**
 * Determines initial payment status based on payment method and fulfilment type
 */
export function getInitialPaymentStatus(
    paymentMethod: PaymentMethod,
    fulfilment: Fulfilment,
    paymentPlan: PaymentPlan = "full"
): PaymentStatus {
    if (paymentMethod === "mpesa") {
        return "pending"
    }

    return fulfilment === "delivery" ? "pay_on_delivery" : "pay_on_pickup"
}

// Payment State Machine
const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    "pending": ["initiated", "deposit_paid", "paid", "pay_on_delivery", "pay_on_pickup"], // Can move to initiated (STK) or Cash modes
    "initiated": ["deposit_paid", "paid", "failed", "initiated"], // Can succeed, fail, or retry (re-initiate)
    "deposit_paid": ["paid", "initiated", "failed"],
    "paid": [], // TERMINAL STATE (Refunds handled separately if ever)
    "failed": ["initiated"], // Can retry
    "pay_on_delivery": ["paid", "failed"], // Can eventually be paid (e.g. driver collects) or fail
    "pay_on_pickup": ["paid", "failed"], // Can eventually be paid (at counter) or fail
}

/**
 * Validates if a payment status transition is allowed.
 * Enforces strict flow: pending -> initiated -> paid/failed
 */
export function isValidPaymentTransition(
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus
): boolean {
    // If status is not changing, it's technically valid (idempotent), 
    // BUT for "initiated", re-initiating usually means a new attempt, which we allow.
    if (currentStatus === newStatus) return true

    const allowed = ALLOWED_PAYMENT_TRANSITIONS[currentStatus] || []
    return allowed.includes(newStatus)
}

/**
 * Checks if an order requires payment before kitchen can prepare
 */
export function requiresPaymentBeforePreparation(order: Order): boolean {
    if (order.payment_method !== "mpesa") return false

    // For M-Pesa, allow prep when deposit is paid (or fully paid).
    const paidEnough = order.payment_status === "paid" || order.payment_status === "deposit_paid"
    if (!paidEnough) return true

    return false
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
        case "deposit_paid":
            return "Deposit Received"
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

    if (paymentStatus === "deposit_paid") {
        return "Deposit received. Clear the balance on pickup/delivery, or pay the remainder now."
    }

    if (paymentStatus === "paid") {
        return "Payment confirmed. Thank you!"
    }

    return ""
}
