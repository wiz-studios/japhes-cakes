// Payment type definitions for Japhe's Cakes & Pizzas

export type PaymentMethod = "mpesa" | "cash"

export type PaymentPlan = "full" | "deposit"

export type PaymentStatus =
    | "pending"
    | "initiated"
    | "deposit_paid"
    | "paid"
    | "pay_on_delivery"
    | "pay_on_pickup"
    | "failed"

export type Fulfilment = "delivery" | "pickup"

export type UserRole = "admin" | "kitchen" | "delivery"

export interface PaymentInfo {
    payment_method: PaymentMethod
    payment_plan?: PaymentPlan
    payment_status: PaymentStatus
    mpesa_phone?: string
    mpesa_transaction_id?: string
    lipana_transaction_id?: string | null
    lipana_checkout_request_id?: string | null
    payment_amount_paid?: number | null
    payment_amount_due?: number | null
    payment_deposit_amount?: number | null
    payment_last_request_amount?: number | null
}

export interface Order {
    id: string
    fulfilment: Fulfilment
    payment_method: PaymentMethod
    payment_plan?: PaymentPlan
    payment_status: PaymentStatus
    status: string
    mpesa_phone?: string
    mpesa_transaction_id?: string
    lipana_transaction_id?: string | null
    lipana_checkout_request_id?: string | null
    payment_amount_paid?: number | null
    payment_amount_due?: number | null
    payment_deposit_amount?: number | null
    payment_last_request_amount?: number | null
}
