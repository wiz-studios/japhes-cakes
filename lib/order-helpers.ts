
import { format, parseISO, isValid } from "date-fns"

export type Order = {
    id: string
    created_at: string
    order_type: "cake" | "pizza"
    status: string
    delivery_window?: string
    preferred_date?: string
    total?: number
    fulfilment?: string
    delivery_zone_id?: string
}

export function formatFriendlyId(order: { id: string, created_at: string, order_type: string }) {
    if (!order.created_at || !order.id) return "PENDING"

    try {
        const date = parseISO(order.created_at)
        if (!isValid(date)) return order.id.slice(0, 8).toUpperCase()

        const prefix = order.order_type === "cake" ? "C" : "P"
        const datePart = format(date, "yyyyMMdd")
        const timePart = format(date, "HHmm")
        const uuidPart = order.id.slice(-4).toUpperCase()

        return `${prefix}${datePart}-${timePart}-${uuidPart}`
    } catch (e) {
        return order.id.slice(0, 8).toUpperCase()
    }
}

export function getDeliveryEstimate(order: { delivery_window?: string, preferred_date?: string, status: string }) {
    if (order.status === "delivered") return "Delivered"
    if (order.status === "cancelled") return "Cancelled"

    // If there's a specific preferred date in the future (more than 24h away roughly), show that
    if (order.preferred_date) {
        const date = parseISO(order.preferred_date)
        if (isValid(date)) {
            // Simple logic: if preferred date is effectively "future", return formatted date
            return `Scheduled for ${format(date, "MMM d, h:mm a")}`
        }
    }

    // Fallback to delivery window or generic estimate
    return order.delivery_window || "45–60 mins"
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
    order_received: "Order Received",
    in_kitchen: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled"
}
