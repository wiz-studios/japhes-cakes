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
    longDistanceThresholdKm: 30, // Triggers min order warning
    extremeDistanceThresholdKm: 40, // Triggers prepaid only warning

    // Base Fee Tiers (Distance Only)
    tiers: [
        { maxKm: 5, fee: 150 },    // Local Thika
        { maxKm: 15, fee: 300 },   // Outskirts
        { maxKm: 30, fee: 600 },   // Juja/Ruiru
        { maxKm: 40, fee: 1000 },  // Long Distance
        { maxKm: 50, fee: 1500 },  // Extreme Distance
    ],

    // Time-Based Multipliers (Production-Ready)
    timeMultipliers: [
        { startHour: 6, endHour: 17, factor: 1.0, label: "Standard Delivery" },
        { startHour: 17, endHour: 21, factor: 1.2, label: "Evening Peak" },
        { startHour: 21, endHour: 23, factor: 1.3, label: "Late Hours" },
        { startHour: 23, endHour: 24, factor: 1.4, label: "Night Delivery" }, // Midnight to midnight wrap handling needed? 
        // Logic below handles 23-6 separately or via check
    ]
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
    // 1. Night Rules (23:00 - 06:00) -> 1.4x
    // Covers 23, 0, 1, 2, 3, 4, 5
    if (hour >= 23 || hour < 6) {
        return { factor: 1.4, label: "Night Delivery" }
    }

    // 2. Late Hours (21:00 - 23:00) -> 1.3x
    if (hour >= 21) {
        return { factor: 1.3, label: "Late Hours" }
    }

    // 3. Evening Peak (17:00 - 21:00) -> 1.2x
    if (hour >= 17) {
        return { factor: 1.2, label: "Evening Peak" }
    }

    // 4. Standard (06:00 - 17:00) -> 1.0x
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
        warning = "Long Distance: Minimum order KES 4,000 applies."
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
