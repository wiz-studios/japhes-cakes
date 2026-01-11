/**
 * STRICT DELIVERY LOGIC
 * Coordinate system: WGS84
 * Shop Location: Thika
 * Timezone: Africa/Nairobi (UTC+3)
 */

export const SHOP_LOCATION = {
    lat: -1.0396,
    lng: 37.0834,
    name: "Japhe's Cakes & Pizza, Thika"
}

export const DELIVERY_RULES = {
    maxRadiusKm: 50, // Absolute Hard Limit
    longDistanceThresholdKm: 35, // Triggers min order warning
    extremeDistanceThresholdKm: 40, // Triggers prepaid only warning

    // Fee Tiers (Mwananchi Friendly)
    tiers: [
        { maxKm: 3, fee: 50 },     // Ultra Local (Walking/Boda)
        { maxKm: 10, fee: 150 },   // Town Outskirts (Standard Boda)
        { maxKm: 20, fee: 300 },   // Mid Range
        { maxKm: 35, fee: 600 },   // Long Distance
        { maxKm: 50, fee: 1000 },  // Extreme Distance (Cost Recovery)
    ],

    // Time-Based Multipliers (Relaxed)
    // 06:00 - 22:00 = 1.0x (No penalty for dinner)
    // 22:00 - 06:00 = 1.3x (Safety Fee)
}

/**
 * Get Nairobi Hour (UTC+3)
 */
function getNairobiHour(): number {
    const now = new Date();
    const utcHour = now.getUTCHours(); // 0-23
    return (utcHour + 3) % 24;
}

/**
 * Get Time Multiplier based on Nairobi Time
 */
export function getTimeMultiplier(hour: number = getNairobiHour()) {
    // Night Rules (22:00 - 06:00) -> 1.3x
    // Covers 22, 23, 0, 1, 2, 3, 4, 5
    if (hour >= 22 || hour < 6) {
        return { factor: 1.3, label: "Late Night Fee" }
    }

    // Standard (06:00 - 22:00) -> 1.0x
    return { factor: 1.0, label: "Standard Delivery" }
}

/**
 * Calculates straight-line distance using Haversine formula
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
    return Number(d.toFixed(2));
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
}

/**
 * Get Base Distance Fee
 */
export function getBaseDistanceFee(distanceKm: number): number {
    if (distanceKm > DELIVERY_RULES.maxRadiusKm) {
        throw new Error(`Outside delivery radius. Max is ${DELIVERY_RULES.maxRadiusKm}km.`)
    }

    for (const tier of DELIVERY_RULES.tiers) {
        if (distanceKm <= tier.maxKm) {
            return tier.fee
        }
    }
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

    // 1. Calculate Base Fee (Distance)
    const baseFee = getBaseDistanceFee(distance)

    // 2. Apply Time Multiplier
    const { factor, label } = getTimeMultiplier()
    const finalFee = Math.ceil(baseFee * factor) // Round up to nearest integer

    // Determine warnings/constraints
    let warning = undefined
    let requiresMinOrder = false
    let requiresPrepaid = false

    if (distance > DELIVERY_RULES.extremeDistanceThresholdKm) {
        warning = "Extreme Distance: Prepaid orders only. Allow 2-4 hours."
        requiresPrepaid = true
        requiresMinOrder = true
    } else if (distance > DELIVERY_RULES.longDistanceThresholdKm) {
        warning = "Long Distance: Minimum order KES 3,000 applies."
        requiresMinOrder = true
    }

    return {
        allowed: true,
        distance,
        fee: finalFee,       // The final price shown to user
        baseFee,             // For admin/breakdown
        timeMultiplier: factor, // For admin/breakdown
        timeLabel: label,    // For UI badge
        warning,
        requiresMinOrder,
        requiresPrepaid
    }
}
