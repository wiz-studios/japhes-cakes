"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet"
import { validateDeliveryLocation } from "@/app/actions/validate-delivery"
import { reverseGeocode } from "@/app/actions/reverse-geocode" // Import new action
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, MapPin, CheckCircle2, XCircle, Navigation, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
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
     * GPS Auto-Location Handler (Robust Implementation)
     * 
     * Attempts to acquire the user's precise coordinates via browser Geolocation API.
     * Uses a two-phase approach for maximum accuracy:
     * 1. Try getCurrentPosition first (fast)
     * 2. If accuracy is poor, fall back to watchPosition (continuous monitoring)
     * 
     * Configuration:
     * - enableHighAccuracy: true (uses GPS instead of network triangulation)
     * - timeout: 30000ms (30 seconds - generous for poor GPS signal)
     * - maximumAge: 0 (always get fresh position, no cache)
     * 
     * Accuracy Standards:
     * - Excellent: < 20m (use immediately)
     * - Acceptable: < 100m (use if timeout approaching)
     * - Poor: > 100m (keep watching for better fix)
     */
    const handleUseGPS = () => {
        if (!navigator.geolocation) {
            toast({ title: "GPS Error", description: "Geolocation not supported by this browser.", variant: "destructive" })
            return
        }

        setIsGPSLoading(true)

        // Track watch to allow cleanup
        let watchId: number | null = null
        let bestPosition: GeolocationPosition | null = null
        let timeoutHandle: NodeJS.Timeout | null = null

        /**
         * Process a GPS position (from either getCurrentPosition or watchPosition)
         * Only accepts positions with acceptable accuracy
         */
        const processPosition = (position: GeolocationPosition, source: 'initial' | 'watch') => {
            const { latitude, longitude, accuracy } = position.coords

            console.log(`📍 GPS ${source}:`, {
                lat: latitude,
                lng: longitude,
                accuracy: `${accuracy.toFixed(1)}m`,
                timestamp: new Date(position.timestamp).toISOString()
            })

            // Check if this position is better than what we have
            if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
                bestPosition = position
            }

            // If accuracy is excellent (< 20m), use immediately
            if (accuracy < 20) {
                console.log("✅ GPS: Excellent accuracy, using position")
                finishWithPosition(bestPosition!)
            }
            // If accuracy is acceptable and we're not watching, use it
            else if (accuracy < 100 && source === 'initial') {
                console.log("⚠️ GPS: Acceptable accuracy, but starting watch for better fix...")
                startWatchPosition()
            }
            // If we're watching and timeout is approaching, use best available
            else if (source === 'watch') {
                console.log(`🔄 GPS: Watching... accuracy ${accuracy.toFixed(1)}m`)
            }
        }

        /**
         * Start continuous position monitoring for better accuracy
         */
        const startWatchPosition = () => {
            if (watchId !== null) return // Already watching

            console.log("🔍 GPS: Starting continuous monitoring...")

            watchId = navigator.geolocation.watchPosition(
                (pos) => processPosition(pos, 'watch'),
                handleError,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            )

            // After 25 seconds, use best position available
            timeoutHandle = setTimeout(() => {
                if (bestPosition) {
                    console.log("⏰ GPS: Timeout reached, using best position:", bestPosition.coords.accuracy.toFixed(1) + "m")
                    finishWithPosition(bestPosition)
                } else {
                    handleError({ code: 3, message: "Timeout", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
                }
            }, 25000)
        }

        /**
         * Clean up and apply the final position
         */
        const finishWithPosition = (position: GeolocationPosition) => {
            // Cleanup
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId)
                watchId = null
            }
            if (timeoutHandle) {
                clearTimeout(timeoutHandle)
                timeoutHandle = null
            }

            const { latitude, longitude, accuracy } = position.coords

            // Apply to map
            const newCenter: [number, number] = [latitude, longitude]
            setMapCenter(newCenter)
            handleMapSettled(latitude, longitude)
            setIsGPSLoading(false)

            toast({
                title: "Location Found",
                description: `Pinned at ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy.toFixed(0)}m)`,
                variant: "default"
            })
        }

        /**
         * Handle GPS errors with specific user guidance
         */
        const handleError = (err: GeolocationPositionError) => {
            // Cleanup
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId)
                watchId = null
            }
            if (timeoutHandle) {
                clearTimeout(timeoutHandle)
                timeoutHandle = null
            }

            console.error("❌ GPS Error:", err, "Code:", err.code)

            let errorMessage = "Please drag the map manually to your location."

            // Provide actionable guidance based on error type
            if (err.code === 1) {
                // User explicitly denied permission
                errorMessage = "Location permission denied. Please enable location services in your browser settings."
            } else if (err.code === 2) {
                // GPS hardware unavailable or disabled
                errorMessage = "Location unavailable. Please check your device's GPS settings."
            } else if (err.code === 3) {
                // Timeout (most common indoors or with poor signal)
                errorMessage = "GPS timeout. Try moving to an open area with clear sky and retry, or drag the map manually."
            }

            toast({
                title: "Could not auto-locate",
                description: errorMessage,
                variant: "destructive"
            })
            setIsGPSLoading(false)
        }

        // Start with a quick getCurrentPosition attempt
        navigator.geolocation.getCurrentPosition(
            (pos) => processPosition(pos, 'initial'),
            // If initial fails, try watch position
            (err) => {
                if (err.code === 3) {
                    // Timeout on initial - try watching
                    console.log("⚠️ Initial GPS timeout, starting watch...")
                    startWatchPosition()
                } else {
                    handleError(err)
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000, // Quick initial attempt
                maximumAge: 0
            }
        )
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
                        {/* GPS Button */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
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
