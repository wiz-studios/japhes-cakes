"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet"
import { validateDeliveryLocation } from "@/app/actions/validate-delivery"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, MapPin, CheckCircle2, XCircle, Navigation, X, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { reverseGeocode, searchPlaces } from "@/app/actions/reverse-geocode"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { SHOP_LOCATION } from "@/lib/delivery-logic"

// ... (Leaflet Icon fixes remain same)
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ... (Interfaces remain same)
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

// ... (MapController & ShopMarker remain same)
function MapController({ onMoveStart, onMoveEnd, center }: any) {
    const map = useMap()
    useEffect(() => { if (center) map.flyTo(center, map.getZoom()) }, [center, map])
    useEffect(() => {
        const handleMoveStart = () => onMoveStart()
        const handleMoveEnd = () => { const center = map.getCenter(); onMoveEnd(center.lat, center.lng) }
        map.on('movestart', handleMoveStart); map.on('moveend', handleMoveEnd)
        return () => { map.off('movestart', handleMoveStart); map.off('moveend', handleMoveEnd) }
    }, [map, onMoveStart, onMoveEnd])
    return null
}

function ShopMarker() {
    return (
        <Marker position={[SHOP_LOCATION.lat, SHOP_LOCATION.lng]} icon={new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })}>
            <Popup><b>Shop Location</b></Popup>
        </Marker>
    )
}

/**
 * GPSLocationPicker Component
 * 
 * Interactive map dialog for selecting delivery locations with GPS support.
 * 
 * Key Features:
 * - Auto-locate via browser GPS API (with 30s timeout)
 * - Manual pin-drop on draggable map
 * - Real-time delivery zone validation (distance + fee calculation)
 * - Server-side reverse geocoding for human-readable addresses
 * - Decoupled validation: address loading never blocks confirmation
 * 
 * State Architecture:
 * - validationStatus: Tracks eligibility (idle | validating | valid | invalid)
 * - addressLabel: Display-only, fetched asynchronously via server action
 * - confirmedLocation: Final user-selected coordinates + metadata
 */
export default function GPSLocationPicker({ onLocationSelect }: GPSLocationPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { toast } = useToast()

    // Decoupled State: Validation (critical) vs Address (decorative)
    const [validationStatus, setValidationStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
    const [validationResult, setValidationResult] = useState<any>(null) // { allowed, distance, fee }
    const [addressLabel, setAddressLabel] = useState<string>("Locating...") // Async, non-blocking

    // UI Interaction State
    const [isDragging, setIsDragging] = useState(false) // Map drag visual feedback
    const [mapCenter, setMapCenter] = useState<[number, number]>([SHOP_LOCATION.lat, SHOP_LOCATION.lng])
    const [confirmedLocation, setConfirmedLocation] = useState<DeliveryLocation | null>(null)
    const [isGPSLoading, setIsGPSLoading] = useState(false) // "Use My Exact Location" button state
    const [manualLat, setManualLat] = useState("")
    const [manualLng, setManualLng] = useState("")
    // Search State
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Reset loop
    useEffect(() => {
        if (isOpen && !confirmedLocation) {
            handleMapSettled(SHOP_LOCATION.lat, SHOP_LOCATION.lng)
        }
    }, [isOpen])

    /**
     * Core Validation Logic (Triggered on map settle or GPS success)
     * 
     * Two-phase approach:
     * 1. CRITICAL PATH: Distance validation (determines if "Confirm" button is enabled)
     * 2. DECORATIVE PATH: Address resolution (display-only, never blocks user)
     * 
     * This decoupling ensures users can always proceed if within delivery range,
     * even if reverse geocoding is slow or fails.
     */
    const handleMapSettled = async (lat: number, lng: number) => {
        setValidationStatus("validating")
        setAddressLabel("Locating...")

        // 1. Critical Path: Distance Validation
        // This determines provided confirmation eligibility
        try {
            const data = await validateDeliveryLocation(lat, lng)
            setValidationResult(data)
            setValidationStatus(data.allowed ? "valid" : "invalid")
        } catch (err) {
            setValidationStatus("invalid")
            setValidationResult({ allowed: false, error: "Validation failed" })
        }

        // 2. Decorative Path: Address Resolution
        // Fire and forget - does not block confirmation
        reverseGeocode(lat, lng)
            .then(res => setAddressLabel(res.label))
            .catch(() => setAddressLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`))
    }

    const handleConfirm = () => {
        // Confirmation relies ONLY on validationStatus
        if (validationStatus === "valid" && validationResult) {
            const loc = {
                lat: mapCenter[0],
                lng: mapCenter[1],
                distance: validationResult.distance,
                fee: validationResult.fee,
                address: addressLabel // Use whatever we have (loaded or fallback)
            }
            setConfirmedLocation(loc)
            onLocationSelect(loc)
            setIsOpen(false)
        }
    }

    /**
     * Production-Ready GPS Location Handler
     * 
     * Attempts to get user's exact location with multiple fallback strategies:
     * 1. Browser GPS (high accuracy, 15s timeout)
     * 2. IP-based geolocation (fallback if GPS fails)
     * 
     * Ensures coordinates are in correct order for Leaflet: [latitude, longitude]
     */
    const handleUseGPS = async () => {
        if (!navigator.geolocation) {
            toast({
                title: "GPS Not Supported",
                description: "Your browser doesn't support location services.",
                variant: "destructive"
            })
            return
        }

        setIsGPSLoading(true)

        try {
            // Attempt GPS location first
            const coords = await getGPSLocation()
            applyLocation(coords.lat, coords.lng, 'GPS')
        } catch (gpsError) {
            console.warn("GPS failed, trying IP fallback:", gpsError)

            // Fallback to IP-based location
            try {
                const coords = await getIPLocation()
                applyLocation(coords.lat, coords.lng, 'IP (Approximate)')
            } catch (ipError) {
                console.error("Both GPS and IP location failed:", ipError)
                toast({
                    title: "Location Unavailable",
                    description: "Could not determine your location. Please drag the map manually.",
                    variant: "destructive"
                })
                setIsGPSLoading(false)
            }
        }
    }

    /**
     * Get precise GPS location using Geolocation API
     * Returns { lat, lng } in correct order
     */
    const getGPSLocation = (): Promise<{ lat: number; lng: number }> => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude
                    const lng = position.coords.longitude
                    const accuracy = position.coords.accuracy

                    // Detailed logging for debugging
                    console.log("🎯 GPS SUCCESS:", {
                        latitude: lat,
                        longitude: lng,
                        accuracy: `${accuracy.toFixed(1)}m`,
                        timestamp: new Date(position.timestamp).toISOString(),
                        altitude: position.coords.altitude,
                        heading: position.coords.heading,
                        speed: position.coords.speed
                    })

                    // Validate coordinates (basic sanity check)
                    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                        reject(new Error(`Invalid GPS coordinates: lat=${lat}, lng=${lng}`))
                        return
                    }

                    // Warn if accuracy is poor
                    if (accuracy > 100) {
                        console.warn(`⚠️ GPS accuracy is poor: ${accuracy.toFixed(0)}m`)
                    }

                    resolve({ lat, lng })
                },
                (error) => {
                    console.error("❌ GPS Error:", {
                        code: error.code,
                        message: error.message,
                        PERMISSION_DENIED: error.code === 1,
                        POSITION_UNAVAILABLE: error.code === 2,
                        TIMEOUT: error.code === 3
                    })

                    let errorMsg = "GPS failed"
                    if (error.code === 1) errorMsg = "Location permission denied"
                    else if (error.code === 2) errorMsg = "Location unavailable"
                    else if (error.code === 3) errorMsg = "GPS timeout"

                    reject(new Error(errorMsg))
                },
                {
                    enableHighAccuracy: true,  // Force GPS (not just WiFi/cell tower)
                    timeout: 15000,             // 15 seconds max
                    maximumAge: 0               // No cached positions
                }
            )
        })
    }

    /**
     * IP-based geolocation fallback (approximate)
     * Uses ipapi.co (free, no token required)
     */
    const getIPLocation = async (): Promise<{ lat: number; lng: number }> => {
        console.log("🌐 Attempting IP-based location...")

        const response = await fetch('https://ipapi.co/json/')

        if (!response.ok) {
            throw new Error(`IP location API failed: ${response.status}`)
        }

        const data = await response.json()

        const lat = parseFloat(data.latitude)
        const lng = parseFloat(data.longitude)

        console.log("🌐 IP Location:", {
            latitude: lat,
            longitude: lng,
            city: data.city,
            region: data.region,
            country: data.country_name,
            approximate: true
        })

        if (isNaN(lat) || isNaN(lng)) {
            throw new Error("Invalid IP location data")
        }

        return { lat, lng }
    }

    /**
     * Apply location to map with detailed logging
     * Ensures coordinates are passed in correct order: [lat, lng]
     */
    const applyLocation = (lat: number, lng: number, source: string) => {
        console.log(`✅ Applying ${source} location:`, {
            latitude: lat,
            longitude: lng,
            coordinateOrder: '[lat, lng]',
            source
        })

        // Leaflet expects [latitude, longitude] order
        const newCenter: [number, number] = [lat, lng]

        // Update map center
        setMapCenter(newCenter)

        // Trigger validation
        handleMapSettled(lat, lng)

        // Stop loading
        setIsGPSLoading(false)

        // Show success message
        toast({
            title: "Location Found",
            description: `${source}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            variant: "default",
            duration: 5000
        })
    }

    /**
     * SEARCH FUNCTIONALITY
     */
    const handleSearch = async () => {
        if (!searchQuery || searchQuery.length < 3) return

        setIsSearching(true)
        const results = await searchPlaces(searchQuery)
        setSearchResults(results)
        setIsSearching(false)
    }

    const handleSelectResult = (result: any) => {
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)

        if (!isNaN(lat) && !isNaN(lng)) {
            applyLocation(lat, lng, "Search Result")
            setSearchResults([]) // Clear results on selection
        }
    }

    return (
        <>
            {/* 1. Trigger Button */}
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

            {/* 2. Full Screen Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md md:max-w-xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b bg-white z-10 w-full relative">
                        <DialogTitle>Select Delivery Location</DialogTitle>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Used to calculate delivery fee</p>
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </DialogHeader>

                    {/* 3. Map Area */}
                    <div className="flex-1 relative bg-gray-100 min-h-0">
                        {/* GPS Button & Manual Input */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                className="shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-bold flex items-center gap-2 transition-all transform active:scale-95"
                                onClick={handleUseGPS}
                                disabled={isGPSLoading}
                            >
                                {isGPSLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                                {isGPSLoading ? "Locating..." : "Use My Exact Location"}
                            </Button>
                            {/* Search Input (Uber-style) */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-3 flex flex-col gap-2 w-72">
                                <div className="font-semibold text-gray-700 text-xs text-center border-b pb-1">Search Place (e.g. Kenyatta University)</div>
                                <div className="flex gap-2 relative">
                                    <input
                                        type="text"
                                        placeholder="Enter location..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                        className="flex-1 px-3 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="h-full bg-blue-600 hover:bg-blue-700 aspect-square p-0"
                                    >
                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>

                                    {/* Search Results Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border max-h-48 overflow-y-auto z-50">
                                            {searchResults.map((result) => (
                                                <div
                                                    key={result.place_id}
                                                    onClick={() => handleSelectResult(result)}
                                                    className="p-2 hover:bg-blue-50 cursor-pointer text-xs border-b last:border-0 flex items-start gap-2"
                                                >
                                                    <MapPin className="h-3 w-3 mt-0.5 text-gray-400 shrink-0" />
                                                    <span className="line-clamp-2 text-gray-700">{result.display_name}</span>
                                                </div>
                                            ))}
                                            <div
                                                className="p-1 text-center text-[10px] text-red-500 hover:bg-gray-50 cursor-pointer font-medium"
                                                onClick={() => setSearchResults([])}
                                            >
                                                Close Results
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-0 z-0">
                            <MapContainer
                                center={[SHOP_LOCATION.lat, SHOP_LOCATION.lng]}
                                zoom={14}
                                style={{ height: "100%", width: "100%" }}
                                zoomControl={false}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap'
                                />
                                <Circle center={[SHOP_LOCATION.lat, SHOP_LOCATION.lng]} radius={15000} pathOptions={{ color: 'red', fill: false, dashArray: '5,10' }} />
                                <ShopMarker />
                                <MapController
                                    center={mapCenter}
                                    onMoveStart={() => setIsDragging(true)}
                                    onMoveEnd={(lat: number, lng: number) => {
                                        setMapCenter([lat, lng])
                                        setIsDragging(false)
                                        handleMapSettled(lat, lng)
                                    }}
                                />
                            </MapContainer>
                        </div>

                        {/* CENTER PIN OVERLAY */}
                        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center pb-8">
                            <div className={`mb-2 bg-black/75 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-opacity duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
                                Drop pin at exact location
                            </div>
                            <div className={`relative transition-transform duration-200 ${isDragging ? '-translate-y-4 scale-110' : 'translate-y-0 scale-100'}`}>
                                <MapPin className="h-10 w-10 text-blue-600 drop-shadow-2xl filter" fill="currentColor" stroke="white" strokeWidth={1} />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full blur-[2px]" />
                            </div>
                        </div>


                    </div>

                    {/* 4. Validation Panel */}
                    <div className="p-4 bg-white border-t space-y-4 z-10">
                        {/* Address Card (Decorative) */}
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border">
                            <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div className="space-y-0.5">
                                <div className="text-xs font-bold text-slate-500 uppercase">Address</div>
                                <div className="text-sm font-medium text-slate-900 leading-snug">
                                    {addressLabel}
                                </div>
                            </div>
                        </div>

                        {/* Status Message (Critical) */}
                        {validationStatus === "validating" && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin" /> Checking availability...
                            </div>
                        )}

                        {validationStatus === "valid" && validationResult && (
                            <Alert className="bg-emerald-50 border-emerald-200">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <AlertTitle className="text-emerald-800">Delivery Available</AlertTitle>
                                <AlertDescription className="text-emerald-700 flex gap-4 mt-1 font-medium">
                                    <span>Distance: {validationResult.distance} km</span>
                                    <span>Fee: {validationResult.fee} KES</span>
                                </AlertDescription>
                            </Alert>
                        )}

                        {validationStatus === "invalid" && validationResult && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertTitle>Outside Delivery Area</AlertTitle>
                                <AlertDescription>
                                    {validationResult.error || "We currently deliver within 15 km of Thika."}
                                    <div className="mt-2 flex gap-2">
                                        <Button variant="outline" size="sm" className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700" onClick={() => handleMapSettled(mapCenter[0], mapCenter[1])}>
                                            Retry
                                        </Button>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* 5. Action Button - Depends ONLY on validationStatus */}
                        <Button
                            className="w-full h-12 text-lg"
                            disabled={validationStatus !== "valid"}
                            onClick={handleConfirm}
                        >
                            {validationStatus === "valid" ? "Confirm Location" : "Select Valid Location"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
