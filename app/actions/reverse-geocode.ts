"use server"

/**
 * REVERSE GEOCODING SERVER ACTION
 * 
 * Fetches human-readable addresses from Nominatim (OpenStreetMap) with strict safeguards.
 * 
 * Design Principles:
 * 1. Non-blocking: Must return rapidly or fallback.
 * 2. Error Swallowing: Never throw errors to the client; degrade to coordinates.
 * 3. Rate Limiting: Respect Nominatim's AUP via identifying User-Agent and caching.
 * 4. Data Hygiene: Normalize and sanitize raw address data.
 */

// LRU-like Cache Implementation
// Using Map's insertion order property (keys iterated in insertion order)
const CACHE = new Map<string, string>()
const MAX_CACHE_SIZE = 1000
const COORD_PRECISION = 5

// Generic terms to filter out from address parts
const BLOCKED_TERMS = new Set(["yes", "no", "true", "false", "building", "structure"])

interface ReverseGeocodeResult {
    label: string
}

/**
 * Resolves a coordinate pair to a human-readable address string.
 * This function handles timeouts, errors, and caching internally.
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @returns Object containing the formatted label
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    // 1. Canonical inputs (Snap to 5 decimal places ~1.1m precision)
    // This improves address accuracy while keeping cache reuse reasonable.
    const latFixed = lat.toFixed(COORD_PRECISION)
    const lngFixed = lng.toFixed(COORD_PRECISION)
    const key = `${latFixed},${lngFixed}`

    // Default fallback (deterministic)
    const fallbackLabel = `${latFixed}, ${lngFixed}`

    // 2. Check Cache
    if (CACHE.has(key)) {
        // Move to end (most recently used)
        const val = CACHE.get(key)!
        CACHE.delete(key)
        CACHE.set(key, val)
        return { label: val }
    }

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000) // 2s strict timeout

        // Reuse snapped coords for URL to align with cache key logic
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latFixed}&lon=${lngFixed}&zoom=18&addressdetails=1`

        const res = await fetch(url, {
            headers: {
                "User-Agent": "JaphesCakes/1.0 (japhescakes@gmail.com)"
            },
            signal: controller.signal,
            next: { revalidate: 86400 } // Long-term fetch cache
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
            throw new Error(`Nominatim Error: ${res.status}`)
        }

        const data = await res.json()

        // 3. Normalize & Sanitize Data
        let address = fallbackLabel
        const a = data.address

        if (a) {
            const parts: string[] = []

            // Priority: Landmark > Road > Suburb > Town
            const candidates = [
                a.amenity || a.building,
                a.road,
                a.suburb || a.neighbourhood || a.village,
                a.city || a.town
            ]

            for (const c of candidates) {
                if (c && typeof c === "string") {
                    const clean = c.trim()
                    if (clean.length > 0 && !BLOCKED_TERMS.has(clean.toLowerCase())) {
                        parts.push(clean)
                    }
                }
            }

            // Limit length and join
            if (parts.length > 0) {
                address = parts.slice(0, 3).join(", ")
            } else {
                // Fallback to display_name if construction failed but data exists
                address = data.display_name?.split(",").slice(0, 3).join(",") || fallbackLabel
            }
        }

        // 4. Update Cache (with Eviction)
        if (CACHE.size >= MAX_CACHE_SIZE) {
            // Delete first key (oldest inserted/accessed)
            const oldestKey = CACHE.keys().next().value
            if (oldestKey) CACHE.delete(oldestKey)
        }

        CACHE.set(key, address)

        return { label: address }

    } catch (error) {
        // 5. Swallow Errors
        // console.error("Reverse Geocode Failed:", error)
        return { label: fallbackLabel }
    }
}

interface SearchResult {
    place_id: number
    display_name: string
    lat: string
    lon: string
}

/**
 * Searches for a location by name using Nominatim.
 * Strictly limited to Kenya.
 * 
 * @param query The search text (e.g., "Kenyatta University")
 */
export async function searchPlaces(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 3) return []

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const q = encodeURIComponent(query)
        // limit=5: minimal results
        // countrycodes=ke: Restrict to Kenya
        // addressdetails=0: We just need label + coords
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=ke&addressdetails=0`

        const res = await fetch(url, {
            headers: {
                "User-Agent": "JaphesCakes/1.0 (japhescakes@gmail.com)"
            },
            signal: controller.signal,
            // Cache search results for 1 hour to prevent spamming
            next: { revalidate: 3600 }
        })

        clearTimeout(timeoutId)

        if (!res.ok) return []

        const data = await res.json()
        return data as SearchResult[]

    } catch (error) {
        // Fail silently
        return []
    }
}
