"use server"

import { validateDeliveryRequest } from "@/lib/delivery-logic"

export async function validateDeliveryLocation(lat: number, lng: number) {
    if (!lat || !lng) {
        return { allowed: false, error: "Invalid coordinates" }
    }

    // 1. Strict Distance/Fee Check
    const result = validateDeliveryRequest(lat, lng)

    if (!result.allowed) {
        return {
            allowed: false,
            error: result.error,
            distance: result.distance
        }
    }

    // 2. Return Result Immediately (Math is fast, Geocoding is slow & optional)
    // We let the client fetch the friendly address to avoid blocking the user.
    return {
        allowed: true,
        distance: result.distance,
        fee: result.fee,
        warning: result.warning,
        requiresMinOrder: result.requiresMinOrder,
        requiresPrepaid: result.requiresPrepaid
    }
}
