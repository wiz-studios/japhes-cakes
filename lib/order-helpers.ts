
import { parseISO, isValid } from "date-fns"
import { formatDateNairobi, formatInNairobi } from "@/lib/time"

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

export function getDeliveryEstimate(order: {
    delivery_window?: string
    preferred_date?: string
    status: string
    fulfilment?: string
    created_at?: string
}) {
    const status = String(order.status || "").toLowerCase()
    const fulfilment = String(order.fulfilment || "").toLowerCase()

    if (status === "delivered") return "Delivered"
    if (status === "collected") return "Collected"
    if (status === "cancelled") return "Cancelled"

    // Status takes precedence over scheduled fields.
    if (status === "ready_for_pickup") {
        return fulfilment === "delivery" ? "Ready for dispatch" : "Ready now"
    }
    if (status === "out_for_delivery") return "Rider on the way"

    if (order.preferred_date) {
        const date = parseISO(order.preferred_date)
        if (isValid(date)) {
            const now = new Date()
            const diffMs = date.getTime() - now.getTime()
            const isFutureSchedule = diffMs > 45 * 60 * 1000
            const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(order.preferred_date.trim())

            if (isFutureSchedule || isDateOnly) {
                if (isDateOnly) {
                    return `Scheduled for ${formatDateNairobi(date, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })}`
                }

                return `Scheduled for ${formatInNairobi(date, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                })}`
            }
        }
    }

    if (order.delivery_window && order.delivery_window.trim()) return order.delivery_window.trim()
    return fulfilment === "pickup" ? "Ready in 30-45 mins" : "45-60 mins"
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
    order_received: "Order Received",
    in_kitchen: "Preparing",
    ready_for_pickup: "Ready for Pickup",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled"
}
