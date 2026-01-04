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
    maxRadiusKm: 15,
    tiers: [
        { maxKm: 2, fee: 0 },
        { maxKm: 5, fee: 150 },
        { maxKm: 10, fee: 300 },
        { maxKm: 15, fee: 500 }, // Strict hike for far distances
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
        throw new Error(`Delivery not available. Distance ${distanceKm}km exceeds maximum radius of ${DELIVERY_RULES.maxRadiusKm}km.`)
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

    const fee = calculateDeliveryFee(distance)

    return {
        allowed: true,
        distance,
        fee
    }
}
