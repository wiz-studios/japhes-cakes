// Payment type definitions for Japhe's Cakes & Pizzas

export type PaymentMethod = "mpesa" | "cash"

export type PaymentStatus =
    | "pending"
    | "initiated"
    | "paid"
    | "pay_on_delivery"
    | "pay_on_pickup"
    | "failed"

export type Fulfilment = "delivery" | "pickup"

export type UserRole = "admin" | "kitchen" | "delivery"

export interface PaymentInfo {
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    mpesa_phone?: string
    mpesa_transaction_id?: string
    lipana_transaction_id?: string | null
    lipana_checkout_request_id?: string | null
}

export interface Order {
    id: string
    fulfilment: Fulfilment
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    status: string
    mpesa_phone?: string
    mpesa_transaction_id?: string
    lipana_transaction_id?: string | null
    lipana_checkout_request_id?: string | null
}
