"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { validateDeliveryLocation } from "@/app/actions/validate-delivery"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, MapPin, Navigation, Search, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { reverseGeocode, searchPlaces } from "@/app/actions/reverse-geocode"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { SHOP_LOCATION } from "@/lib/delivery-logic"

// --- Global Fixes for Leaflet ---
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Types ---
interface DeliveryLocation {
    lat: number
    lng: number
    distance: number
    fee: number
    address?: string
    error?: string
}

interface GPSLocationPickerProps {
    onLocationSelect: (location: DeliveryLocation | null) => void
}

/**
 * MapController component
 * Handles programmatic map movements and event listening
 */
function MapController({
    center,
    onMoveStart,
    onMoveEnd
}: {
    center: [number, number] | null,
    onMoveStart: () => void,
    onMoveEnd: (center: L.LatLng) => void
}) {
    const map = useMap()
    const isFlying = useRef(false)

    // Handle center updates (flyTo)
    useEffect(() => {
        if (center) {
            isFlying.current = true
            map.flyTo(center, 15, {
                duration: 1.5,
                easeLinearity: 0.25
            })
            // Reset flying flag after animation roughly ends
            setTimeout(() => { isFlying.current = false }, 1600)
        }
    }, [center, map])

    // Bind map events
    useMapEvents({
        movestart: () => {
            if (!isFlying.current) onMoveStart()
        },
        moveend: () => {
            // Only trigger moveEnd logic if not in the middle of a flyTo sequence
            // (Though flyTo triggers moveend at the end, which is what we want)
            onMoveEnd(map.getCenter())
        },
        dragstart: () => {
            isFlying.current = false // User taking control overrides flyTo
            onMoveStart()
        }
    })

    return null
}

export default function GPSLocationPicker({ onLocationSelect }: GPSLocationPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { toast } = useToast()

    // --- State ---

    // Core Location & Validation
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null) // Used ONLY for flyTo triggers
    const [currentCenter, setCurrentCenter] = useState<{ lat: number, lng: number }>({ lat: SHOP_LOCATION.lat, lng: SHOP_LOCATION.lng })

    const [address, setAddress] = useState<string>("Locating...")
    const [validation, setValidation] = useState<{ allowed: boolean, distance?: number, fee?: number, error?: string } | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const [isPinLifted, setIsPinLifted] = useState(false)

    // Search
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Confirmed State (for the trigger button)
    const [confirmedLocation, setConfirmedLocation] = useState<DeliveryLocation | null>(null)

    // Refs for debouncing/cancellation
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Open/Close - Initialize Map
    useEffect(() => {
        if (isOpen && !confirmedLocation) {
            // Trigger initial validation for default location
            handleMapSettled(SHOP_LOCATION.lat, SHOP_LOCATION.lng)
        }
    }, [isOpen])

    // --- Logic: Search ---

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

        if (!searchQuery || searchQuery.length < 3) {
            setSearchResults([])
            return
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true)
            try {
                const results = await searchPlaces(searchQuery)
                setSearchResults(results)
            } catch (e) { console.error(e) }
            setIsSearching(false)
        }, 300)

        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
    }, [searchQuery])

    const handleSelectResult = (result: any) => {
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        if (!isNaN(lat) && !isNaN(lng)) {
            setMapCenter([lat, lng]) // Triggers flyTo
            setSearchQuery("")
            setSearchResults([])
            // Validation will trigger automatically on moveend
        }
    }

    // --- Logic: GPS ---

    const handleUseGPS = () => {
        if (!navigator.geolocation) return

        // Show loading state implicitly via UI or toast
        toast({ title: "Locating you...", description: "Please wait while we get your position." })

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords
                setMapCenter([latitude, longitude]) // Triggers flyTo
                toast({ title: "Found you!", className: "bg-emerald-600 text-white border-none" })
            },
            (err) => {
                toast({
                    title: "Location failed",
                    description: "Could not fetch GPS location. Please drag the map manually.",
                    variant: "destructive"
                })
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    // --- Logic: Map Moves ---

    const handleMoveStart = () => {
        setIsPinLifted(true)
        setAddress("Locating...")
        setValidation(null)
        // Cancel any pending validation
        if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current)
        if (abortControllerRef.current) abortControllerRef.current.abort()
    }

    const handleMoveEnd = (center: L.LatLng) => {
        setIsPinLifted(false)
        setCurrentCenter({ lat: center.lat, lng: center.lng })
        handleMapSettled(center.lat, center.lng)
    }

    // --- Logic: Validation & Reverse Geocode (The "Brain") ---

    const handleMapSettled = useCallback((lat: number, lng: number) => {
        setIsValidating(true)

        // Cancel previous
        if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current)
        if (abortControllerRef.current) abortControllerRef.current.abort()

        // Debounce slightly to allow pin to settle visually
        validationTimeoutRef.current = setTimeout(async () => {
            const controller = new AbortController()
            abortControllerRef.current = controller

            try {
                // Parallel requests: Check Delivery + Get Address
                const [valRes, geoRes] = await Promise.all([
                    validateDeliveryLocation(lat, lng),
                    reverseGeocode(lat, lng)
                ])

                if (controller.signal.aborted) return

                setValidation(valRes)
                setAddress(geoRes.label)

            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("Validation error:", error)
                    setAddress("Unknown Location")
                }
            } finally {
                if (!controller.signal.aborted) setIsValidating(false)
            }
        }, 100)
    }, [])


    const handleConfirm = () => {
        if (validation && validation.allowed) {
            const loc: DeliveryLocation = {
                lat: currentCenter.lat,
                lng: currentCenter.lng,
                distance: validation.distance,
                fee: validation.fee,
                address: address
            }
            setConfirmedLocation(loc)
            onLocationSelect(loc)
            setIsOpen(false)
        }
    }

    // --- Render ---

    return (
        <>
            {/* Trigger Button (stays same) */}
            <div className="border rounded-xl p-4 bg-gray-50 hover:bg-white hover:border-gray-300 transition-colors cursor-pointer" onClick={() => setIsOpen(true)}>
                <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        {confirmedLocation ? "Delivery Location Set" : "Tap to Select Location"}
                    </span>
                    <Badge variant={confirmedLocation ? "default" : "outline"} className={confirmedLocation ? "bg-emerald-600" : ""}>
                        {confirmedLocation ? "Confirmed" : "Required"}
                    </Badge>
                </div>
                {confirmedLocation ? (
                    <div className="text-sm space-y-1">
                        <div className="font-medium text-gray-900">{confirmedLocation.address}</div>
                        <div className="text-gray-500 flex gap-3">
                            <span>{confirmedLocation.distance} km</span>
                            <span className="font-semibold text-emerald-700">Fee: {confirmedLocation.fee} KES</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-400">Map will open in full screen mode</div>
                )}
            </div>

            {/* Full Screen Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-none w-screen h-screen p-0 m-0 rounded-none border-none flex flex-col overflow-hidden bg-gray-100">

                    {/* Layer 1: The Map */}
                    <div className="absolute inset-0 z-0">
                        <MapContainer
                            center={[SHOP_LOCATION.lat, SHOP_LOCATION.lng]}
                            zoom={15}
                            zoomControl={false}
                            style={{ height: "100%", width: "100%" }}
                        >
                            {/* Premium OSM Styles (CartoDB Voyager) */}
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            />

                            <MapController
                                center={mapCenter}
                                onMoveStart={handleMoveStart}
                                onMoveEnd={handleMoveEnd}
                            />
                        </MapContainer>
                    </div>

                    {/* Layer 2: Fixed Center Pin */}
                    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center pb-8 md:pb-0">
                        <div className="relative flex flex-col items-center justify-end" style={{ transform: isPinLifted ? 'translateY(-10px)' : 'translateY(0px)', transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
                            {/* The Pin */}
                            <div className="relative z-20">
                                <MapPin className="h-10 w-10 text-black fill-black drop-shadow-xl" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
                            </div>
                            {/* The Pin Stem/Point */}
                            <div className="w-0.5 h-4 bg-black/50 z-10 -mt-1 mx-auto" />
                            {/* The Shadow (stays on ground, fades on lift) */}
                            <div className="w-10 h-2 bg-black/20 rounded-[100%] blur-[2px] transition-all duration-150"
                                style={{ transform: isPinLifted ? 'scale(0.8) translateY(10px)' : 'scale(1) translateY(0)', opacity: isPinLifted ? 0.3 : 0.6 }}
                            />
                        </div>
                        {/* Tooltip on launch */}
                        <div className={`absolute mt-24 bg-black/75 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition-opacity duration-300 ${!isPinLifted && !address.includes("Locating") ? 'opacity-100 delay-1000' : 'opacity-0'}`}>
                            Move map to adjust
                        </div>
                    </div>

                    {/* Layer 3: Floating Top Search */}
                    <div className="absolute top-4 left-4 right-4 z-20 flex gap-2 max-w-xl mx-auto">
                        <button onClick={() => setIsOpen(false)} className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform">
                            <X className="h-5 w-5" />
                        </button>
                        <div className="flex-1 relative">
                            <div className="bg-white rounded-full shadow-lg flex items-center px-4 h-11 border border-transparent focus-within:border-blue-500 transition-all">
                                <Search className="h-4 w-4 text-gray-400 mr-2" />
                                <input
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none placeholder:text-gray-400"
                                    placeholder="Search location (e.g. Kenyatta Uni)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {isSearching && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                            </div>

                            {/* Autocomplete Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden py-1 border animate-in fade-in zoom-in-95 duration-200">
                                    {searchResults.map((result) => (
                                        <div
                                            key={result.place_id}
                                            onClick={() => handleSelectResult(result)}
                                            className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer flex items-start gap-3 transition-colors"
                                        >
                                            <div className="bg-gray-100 p-1.5 rounded-full shrink-0 mt-0.5">
                                                <MapPin className="h-3 w-3 text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-800 line-clamp-1">{result.display_name.split(',')[0]}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1">{result.display_name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Layer 4: Floating Bottom Panel (The "Sheet") */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center">

                        {/* GPS FAB */}
                        <div className="self-end mr-4 mb-4">
                            <Button
                                onClick={handleUseGPS}
                                size="icon"
                                className="h-12 w-12 rounded-full shadow-xl bg-white text-gray-700 hover:bg-gray-50 border border-gray-100"
                            >
                                <Navigation className="h-5 w-5 fill-current" />
                            </Button>
                        </div>

                        {/* Details Card */}
                        <div className="bg-white w-full max-w-xl rounded-t-3xl shadow-[0_-4px_30px_rgba(0,0,0,0.1)] p-5 md:p-6 pb-8 animate-in slide-in-from-bottom duration-300">
                            {/* Handle Bar (Visual only) */}
                            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

                            <div className="space-y-4">
                                {/* Address Display */}
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Delivery Address</div>
                                    {isValidating ? (
                                        <div className="h-7 w-3/4 bg-gray-100 animate-pulse rounded" />
                                    ) : (
                                        <div className="text-lg font-semibold text-gray-900 leading-tight">{address}</div>
                                    )}
                                </div>

                                {/* Validation Info */}
                                {validation && (
                                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${validation.allowed ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                                        <div className={`p-2 rounded-full ${validation.allowed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                            {validation.allowed ? <MapPin className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className={`text-sm font-bold ${validation.allowed ? "text-emerald-900" : "text-red-900"}`}>
                                                {validation.allowed ? "Delivery Available" : "Out of Delivery Zone"}
                                            </div>
                                            {validation.allowed ? (
                                                <div className="text-xs text-emerald-700 flex gap-3 mt-0.5">
                                                    <span>Dist: {validation.distance}km</span>
                                                    <span>Fee: {validation.fee} KES</span>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-red-700 mt-0.5">{validation.error || "Too far from shop"}</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Confirm Button */}
                                <Button
                                    onClick={handleConfirm}
                                    disabled={!validation?.allowed || isValidating}
                                    className={`w-full h-14 text-lg font-bold rounded-xl transition-all ${validation?.allowed ? 'bg-black hover:bg-gray-800 text-white shadow-lg shadow-gray-200' : 'bg-gray-200 text-gray-400'}`}
                                >
                                    {isValidating ? (
                                        <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Calculating...</span>
                                    ) : (
                                        "Confirm Location"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                </DialogContent>
            </Dialog>
        </>
    )
}
