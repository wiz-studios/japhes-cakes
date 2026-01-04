"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet"
import { validateDeliveryLocation } from "@/app/actions/validate-delivery"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, MapPin, CheckCircle2, XCircle, Navigation } from "lucide-react"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { SHOP_LOCATION } from "@/lib/delivery-logic"

// Fix Leaflet icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

// Helper to track map movement for the strict "Fixed Pin" UI
function MapController({ onMoveStart, onMoveEnd, center }: any) {
    const map = useMap()

    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom())
        }
    }, [center, map])

    useEffect(() => {
        const handleMoveStart = () => onMoveStart()
        const handleMoveEnd = () => {
            const center = map.getCenter()
            onMoveEnd(center.lat, center.lng)
        }

        map.on('movestart', handleMoveStart)
        map.on('moveend', handleMoveEnd)

        return () => {
            map.off('movestart', handleMoveStart)
            map.off('moveend', handleMoveEnd)
        }
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

export default function GPSLocationPicker({ onLocationSelect }: GPSLocationPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [status, setStatus] = useState<"idle" | "dragging" | "validating" | "valid" | "invalid">("idle")
    const [result, setResult] = useState<any>(null)
    const [mapCenter, setMapCenter] = useState<[number, number]>([SHOP_LOCATION.lat, SHOP_LOCATION.lng])
    const [confirmedLocation, setConfirmedLocation] = useState<DeliveryLocation | null>(null)

    const [address, setAddress] = useState<string>("Locating...")

    // Reset when opening
    useEffect(() => {
        if (isOpen && !confirmedLocation) {
            validate(SHOP_LOCATION.lat, SHOP_LOCATION.lng)
        }
    }, [isOpen])

    const validate = async (lat: number, lng: number) => {
        setStatus("validating")
        setAddress("Locating...")

        // 1. Math (Fast, Critical)
        const checkPromise = validateDeliveryLocation(lat, lng)
            .then(data => {
                if (data.allowed) {
                    setResult(data)
                    setStatus("valid")
                } else {
                    setResult(data)
                    setStatus("invalid")
                }
            })
            .catch(() => setStatus("invalid"))

        // 2. Address (Slow, Aesthetic)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
                const addr = data.display_name?.split(",").slice(0, 3).join(",") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                setAddress(addr)
            })
            .catch(() => setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`))
    }

    const handleConfirm = () => {
        if (status === "valid" && result) {
            const loc = {
                lat: mapCenter[0],
                lng: mapCenter[1],
                distance: result.distance,
                fee: result.fee,
                address: address
            }
            setConfirmedLocation(loc)
            onLocationSelect(loc)
            setIsOpen(false)
        }
    }

    const [isLocating, setIsLocating] = useState(false)

    const handleUseGPS = () => {
        if (!navigator.geolocation) return alert("GPS not supported")

        setIsLocating(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords
                setMapCenter([latitude, longitude]) // Triggers FlyTo
                validate(latitude, longitude)
                setIsLocating(false)
            },
            (err) => {
                alert("Could not access GPS. Please ensure location services are enabled.")
                setIsLocating(false)
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
                    </DialogHeader>

                    {/* 3. Map Area */}
                    <div className="flex-1 relative bg-gray-100 min-h-0">
                        {/* GPS Button - Prominent Top Center */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                            <Button
                                variant="default"
                                size="sm"
                                className="shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-bold flex items-center gap-2 transition-all transform active:scale-95"
                                onClick={handleUseGPS}
                                disabled={isLocating}
                            >
                                {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                                {isLocating ? "Locating..." : "Use My Exact Location"}
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
                                    onMoveStart={() => setStatus("dragging")}
                                    onMoveEnd={(lat: number, lng: number) => {
                                        setMapCenter([lat, lng])
                                        validate(lat, lng)
                                    }}
                                />
                            </MapContainer>
                        </div>

                        {/* CENTER PIN OVERLAY */}
                        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center pb-8">
                            {/* Label above pin */}
                            <div className={`mb-2 bg-black/75 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg transition-opacity duration-200 ${status === 'dragging' ? 'opacity-0' : 'opacity-100'}`}>
                                Drop pin at exact location
                            </div>
                            {/* The Pin */}
                            <div className={`relative transition-transform duration-200 ${status === 'dragging' ? '-translate-y-4 scale-110' : 'translate-y-0 scale-100'}`}>
                                <MapPin className="h-10 w-10 text-blue-600 drop-shadow-2xl filter" fill="currentColor" stroke="white" strokeWidth={1} />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full blur-[2px]" />
                            </div>
                        </div>


                    </div>

                    {/* 4. Validation Panel */}
                    <div className="p-4 bg-white border-t space-y-4 z-10">
                        {/* Address Card */}
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border">
                            <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div className="space-y-0.5">
                                <div className="text-xs font-bold text-slate-500 uppercase">Address</div>
                                <div className="text-sm font-medium text-slate-900 leading-snug">
                                    {address}
                                </div>
                            </div>
                        </div>

                        {/* Status Message */}
                        {status === "validating" && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin" /> Checking availability...
                            </div>
                        )}

                        {status === "valid" && result && (
                            <Alert className="bg-emerald-50 border-emerald-200">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <AlertTitle className="text-emerald-800">Delivery Available</AlertTitle>
                                <AlertDescription className="text-emerald-700 flex gap-4 mt-1 font-medium">
                                    <span>Distance: {result.distance} km</span>
                                    <span>Fee: {result.fee} KES</span>
                                </AlertDescription>
                            </Alert>
                        )}

                        {status === "invalid" && result && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertTitle>Outside Delivery Area</AlertTitle>
                                <AlertDescription>
                                    {result.error || "We currently deliver within 15 km of Thika."}
                                    <div className="mt-2 flex gap-2">
                                        <Button variant="outline" size="sm" className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700" onClick={() => mapCenter && validate(mapCenter[0], mapCenter[1])}>
                                            Retrying...
                                        </Button>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* 5. Action Button */}
                        <Button
                            className="w-full h-12 text-lg"
                            disabled={status !== "valid"}
                            onClick={handleConfirm}
                        >
                            {status === "valid" ? "Confirm Location" : "Select Valid Location"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
