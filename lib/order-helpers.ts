
import { parseISO, isValid } from "date-fns"
import { formatDateTimeNairobi } from "@/lib/time"

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

export function formatFriendlyId(order: { id: string, created_at: string | Date, order_type: string, friendly_id?: string | null }) {
    if (order.friendly_id) return order.friendly_id
    if (!order.created_at || !order.id) return "PENDING"

    try {
        const date = typeof order.created_at === "string" ? parseISO(order.created_at) : new Date(order.created_at)
        if (!isValid(date)) return order.id.slice(0, 8).toUpperCase()

        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(date)

        const getPart = (type: string) => parts.find((part) => part.type === type)?.value || "00"

        const prefix = order.order_type === "cake" ? "C" : "P"
        const datePart = `${getPart("year")}${getPart("month")}${getPart("day")}`
        const timePart = `${getPart("hour")}${getPart("minute")}`
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
            return `Scheduled for ${formatDateTimeNairobi(date, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            })}`
        }
    }

    // Fallback to delivery window or generic estimate
    return order.delivery_window || "45-60 mins"
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
    order_received: "Order Received",
    in_kitchen: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled"
}
