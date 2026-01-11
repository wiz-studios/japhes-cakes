/**
 * STRICT DELIVERY LOGIC
 * Coordinate system: WGS84
 * Shop Location: Thika
 */

export const SHOP_LOCATION = {
    lat: -1.0396,
    lng: 37.0834,
    name: "Japhe's Cakes & Pizza, Thika"
}

export const DELIVERY_RULES = {
    maxRadiusKm: 50, // Absolute Hard Limit
    longDistanceThresholdKm: 30, // Triggers min order warning
    extremeDistanceThresholdKm: 40, // Triggers prepaid only warning

    // Fee Tiers (Strict & Defensible)
    tiers: [
        { maxKm: 5, fee: 150 },    // Local Thika
        { maxKm: 15, fee: 300 },   // Outskirts
        { maxKm: 30, fee: 600 },   // Juja/Ruiru
        { maxKm: 40, fee: 1000 },  // Long Distance (Nairobi North)
        { maxKm: 50, fee: 1500 },  // Extreme Distance (Nairobi CBD)
    ]
}

/**
 * Calculates straight-line distance using Haversine formula
 * Returns distance in Kilometers
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Number(d.toFixed(2)); // Round to 2 decimal places
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
}

/**
 * Deterministic Fee Calculation
 */
export function calculateDeliveryFee(distanceKm: number): number {
    if (distanceKm > DELIVERY_RULES.maxRadiusKm) {
        throw new Error(`Outside delivery radius. Max is ${DELIVERY_RULES.maxRadiusKm}km.`)
    }

    for (const tier of DELIVERY_RULES.tiers) {
        if (distanceKm <= tier.maxKm) {
            return tier.fee
        }
    }

    // Fallback for edge cases exactly at 50, or floating point weirdness
    // though the loop should catch it.
    return DELIVERY_RULES.tiers[DELIVERY_RULES.tiers.length - 1].fee
}

/**
 * Validate and Price a Delivery Request
 */
export function validateDeliveryRequest(lat: number, lng: number) {
    if (!lat || !lng) {
        return { allowed: false, error: "Missing coordinates" }
    }

    const distance = calculateDistanceKm(SHOP_LOCATION.lat, SHOP_LOCATION.lng, lat, lng)

    if (distance > DELIVERY_RULES.maxRadiusKm) {
        return {
            allowed: false,
            error: `Sorry, we currently deliver within ${DELIVERY_RULES.maxRadiusKm}km of Thika. You are ${distance}km away.`
        }
    }

    const fee = calculateDeliveryFee(distance)

    // Determine warnings/constraints based on distance
    let warning = undefined
    let requiresMinOrder = false
    let requiresPrepaid = false

    if (distance > DELIVERY_RULES.extremeDistanceThresholdKm) {
        warning = "Extreme Distance: Prepaid orders only. Allow 2-4 hours."
        requiresPrepaid = true
        requiresMinOrder = true // Implied usually, but backend handles strict amount check
    } else if (distance > DELIVERY_RULES.longDistanceThresholdKm) {
        warning = "Long Distance: Minimum order KES 4,000 applies."
        requiresMinOrder = true
    }

    return {
        allowed: true,
        distance,
        fee,
        warning,
        requiresMinOrder,
        requiresPrepaid
    }
}
