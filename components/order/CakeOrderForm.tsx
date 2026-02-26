"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2, UploadCloud, X } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { OrderLayout } from "./OrderLayout"
import { orderThemes } from "./themes"
import { CAKE_FLAVORS, CAKE_SIZES, getCakeDisplayName, getCakePrice } from "@/lib/cake-pricing"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"
import { getNairobiHour } from "@/lib/time"
import type { StoreSettings } from "@/lib/store-settings"
import { uploadCakeDesignImage } from "@/app/actions/orders"

import dynamic from "next/dynamic"

// Dynamically import GPS Picker to avoid SSR issues with Leaflet
const GPSLocationPicker = dynamic(() => import('@/components/GPSLocationPicker'), { ssr: false })

/**
 * Zod schema for validating cake order inputs.
 * Includes validation for size, flavor, fulfillment method, and delivery details.
 */
const cakeSchema = z.object({
    cakeSize: z.string().min(1, "Please select a size"),
    cakeFlavor: z.string().min(1, "Please select a flavor"),
    designNotes: z.string().optional(),
    cakeMessage: z.string().optional(),
    designImageUrl: z.string().optional(),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryZoneId: z.string().optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    deliveryAddress: z.string().optional(),
    deliveryFee: z.number().optional(),
    deliveryDistance: z.number().optional(),
    preferredDate: z.date({ required_error: "Date required" }),
    customerName: z.string().min(2, "Min 2 chars"),
    phone: z.string().regex(KENYA_PHONE_REGEX, "Use 07XXXXXXXX or 01XXXXXXXX"),
}).refine((data) => {
    // Custom validation: Require location coords if delivery is selected
    if (data.fulfilment === "delivery" && (!data.deliveryLat || !data.deliveryLng)) return false
    return true
}, { message: "Delivery location required", path: ["fulfilment"] })

interface DeliveryZone {
    id: string; name: string; delivery_fee: number; allows_cake: boolean;
}

/**
 * CakeOrderForm Component
 * 
 * Handles the multi-step process of ordering a cake.
 * 
 * Features:
 * - Reactive pricing based on size and flavor.
 * - Dynamic delivery fee calculation via GPSLocationPicker.
 * - Validates input using Zod before redirecting to review.
 */
export function CakeOrderForm({ zones, storeSettings }: { zones: DeliveryZone[]; storeSettings: StoreSettings }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const theme = orderThemes.cake
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [dateOpen, setDateOpen] = useState(false)
    const [designImageUploading, setDesignImageUploading] = useState(false)
    const [designImageError, setDesignImageError] = useState("")
    const busyOrdersPaused = storeSettings.busyModeEnabled && storeSettings.busyModeAction === "disable_orders"
    const busyEtaMode = storeSettings.busyModeEnabled && storeSettings.busyModeAction === "increase_eta"

    // Retrieve existing order data from URL if editing an order
    const rawOrder = searchParams.get("order") ? JSON.parse(decodeURIComponent(searchParams.get("order")!)) : null

    // Map the nested order object (from Review page) back to flat form fields
    const defaultValues: Partial<z.infer<typeof cakeSchema>> = rawOrder?.items ? {
        fulfilment: rawOrder.fulfilment || "pickup",
        cakeSize: rawOrder.items[0]?.size || "",
        cakeFlavor: rawOrder.items[0]?.flavor || "",
        customerName: rawOrder.items[0]?.customerName || rawOrder.items[0]?.name || "", // Fallback if name stored differently
        phone: rawOrder.phone || "",
        designNotes: rawOrder.items[0]?.notes || "",
        cakeMessage: rawOrder.items[0]?.message || "",
        designImageUrl: rawOrder.items[0]?.designImageUrl || "",
        deliveryZoneId: rawOrder.deliveryZoneId || "", // Might be missing if not passed back, user selects again
        preferredDate: rawOrder.scheduledDate ? new Date(rawOrder.scheduledDate) : undefined,
    } : (rawOrder || {
        fulfilment: "pickup", cakeSize: "", cakeFlavor: "", customerName: "", phone: "",
        designNotes: "", cakeMessage: "", designImageUrl: "", deliveryZoneId: "",
    })

    const form = useForm<z.infer<typeof cakeSchema>>({
        resolver: zodResolver(cakeSchema),
        defaultValues: {
            fulfilment: "pickup",
            cakeSize: "",
            cakeFlavor: "",
            customerName: "",
            phone: "",
            designNotes: "",
            cakeMessage: "",
            designImageUrl: "",
            deliveryZoneId: "",
            ...defaultValues
        },
    })

    // Watch values for real-time pricing display
    const watchSize = form.watch("cakeSize")
    const watchFlavor = form.watch("cakeFlavor")
    const watchDesignImageUrl = form.watch("designImageUrl")

    const estimatedTotal = watchSize && watchFlavor ? getCakePrice(watchFlavor, watchSize) : 0

    /**
     * Form Submission Handler
     * Constructs the order data object and redirects to the review page.
     */
    async function onSubmit(values: z.infer<typeof cakeSchema>) {
        if (busyOrdersPaused) return
        setIsSubmitting(true)
        const orderData = {
            type: "cake",
            items: [{
                name: getCakeDisplayName(values.cakeFlavor),
                quantity: 1,
                size: values.cakeSize,
                flavor: values.cakeFlavor,
                notes: values.designNotes,
                message: values.cakeMessage,
                designImageUrl: values.designImageUrl,
                price: getCakePrice(values.cakeFlavor, values.cakeSize)
            }],
            total: getCakePrice(values.cakeFlavor, values.cakeSize),
            deliveryFee: values.fulfilment === "delivery" ? (values.deliveryFee || 0) : 0,
            fulfilment: values.fulfilment,
            deliveryZone: values.fulfilment === "delivery" ? `GPS Delivery (${values.deliveryDistance}km)` : "",
            deliveryZoneId: null,
            deliveryLat: values.deliveryLat,
            deliveryLng: values.deliveryLng,
            deliveryAddress: values.deliveryAddress,
            deliveryDistance: values.deliveryDistance,
            customerName: values.customerName,
            scheduledDate: values.preferredDate ? values.preferredDate.toISOString().slice(0, 10) : "",
            placedHour: getNairobiHour(),
            phone: values.phone,
        }
        router.push(`/order/review?order=${encodeURIComponent(JSON.stringify(orderData))}`)
    }

    async function handleDesignImageChange(file: File | null) {
        if (!file) return
        setDesignImageError("")
        setDesignImageUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)
            const result = await uploadCakeDesignImage(formData)
            if (!result.success || !result.url) {
                setDesignImageError(result.error || "Image upload failed.")
                return
            }
            form.setValue("designImageUrl", result.url, { shouldDirty: true, shouldValidate: true })
        } catch (error) {
            setDesignImageError("Image upload failed.")
        } finally {
            setDesignImageUploading(false)
        }
    }

    return (
        <OrderLayout theme={theme} title="Design Your Cake" subtitle="Customize every detail.">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <section className={cn("overflow-hidden rounded-[26px] border bg-white/80 shadow-[0_22px_55px_-40px_rgba(15,20,40,0.4)]", theme.colors.border)}>
                        <div className="relative h-52 w-full md:h-60">
                            <Image
                                src="/shop-cake.jpg"
                                alt="Japhe's Cake House storefront"
                                fill
                                priority
                                className="object-cover"
                                sizes="100vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                                <p className="text-[10px] uppercase tracking-[0.35em] text-white/80">Cake House</p>
                                <h3 className="mt-1 text-lg font-semibold">Visit our Thika cake shop</h3>
                            </div>
                        </div>
                    </section>

                    {busyOrdersPaused && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                            <p className="font-semibold">Orders temporarily paused</p>
                            <p className="mt-1 text-xs">
                                {storeSettings.busyModeMessage || "The kitchen is overloaded right now. Please try again shortly."}
                            </p>
                        </div>
                    )}
                    {busyEtaMode && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
                            <p className="font-semibold">High demand notice</p>
                            <p className="mt-1 text-xs">
                                Expect around +{storeSettings.busyModeExtraMinutes} minutes on prep/delivery windows.
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className={cn("text-lg font-bold", theme.colors.accent)}>1. Cake Details</h3>
                            {estimatedTotal > 0 && (
                                <span className="text-xl font-bold text-rose-600">
                                    {estimatedTotal.toLocaleString()} KES
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="cakeSize" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Size</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className={theme.colors.ring}><SelectValue placeholder="Select Weight" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {CAKE_SIZES.map((size) => (
                                                <SelectItem key={size} value={size}>{size.toUpperCase()}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="cakeFlavor" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flavor</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className={theme.colors.ring}><SelectValue placeholder="Select Flavor" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {/* Standard Flavors */}
                                            {CAKE_FLAVORS.map((flavor) => (
                                                <SelectItem key={flavor} value={flavor}>{flavor}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="cakeMessage" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Message (Optional)</FormLabel>
                                <FormControl><Input placeholder="Happy Birthday..." className={theme.colors.ring} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="designNotes" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Design Notes</FormLabel>
                                <FormControl><Textarea placeholder="Describe the design..." className={theme.colors.ring} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
                            <FormLabel>Reference Image (Optional)</FormLabel>
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                    <UploadCloud className="h-4 w-4" />
                                    {designImageUploading ? "Uploading..." : "Upload Design"}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        disabled={designImageUploading}
                                        onChange={(event) => {
                                            const file = event.target.files?.[0] || null
                                            void handleDesignImageChange(file)
                                            event.currentTarget.value = ""
                                        }}
                                    />
                                </label>
                                {watchDesignImageUrl && (
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                        onClick={() => form.setValue("designImageUrl", "", { shouldDirty: true })}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Remove
                                    </button>
                                )}
                            </div>
                            {designImageError && <p className="text-xs text-red-600">{designImageError}</p>}
                            {watchDesignImageUrl && (
                                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                    <img
                                        src={watchDesignImageUrl}
                                        alt="Uploaded cake design reference"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                            <p className="text-xs text-slate-500">Upload a sample design if you want us to match a specific look.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className={cn("text-lg font-bold border-b pb-2", theme.colors.border, theme.colors.accent)}>2. Date & Delivery</h3>
                        <FormField control={form.control} name="preferredDate" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Preferred Date</FormLabel>
                                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground", theme.colors.ring)}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(date) => {
                                                field.onChange(date)
                                                if (date) setDateOpen(false)
                                            }}
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="fulfilment" render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Method</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="pickup" /></FormControl><FormLabel>Pickup (Thika)</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="delivery" /></FormControl><FormLabel>Delivery</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        {form.watch("fulfilment") === "delivery" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <FormLabel>Where are we delivering?</FormLabel>
                                <GPSLocationPicker
                                    onLocationSelect={(loc) => {
                                        if (loc) {
                                            form.setValue("deliveryLat", loc.lat)
                                            form.setValue("deliveryLng", loc.lng)
                                            form.setValue("deliveryFee", loc.fee)
                                            form.setValue("deliveryDistance", loc.distance)
                                            form.clearErrors("fulfilment")
                                        } else {
                                            form.setValue("deliveryLat", undefined)
                                            form.setValue("deliveryFee", 0)
                                        }
                                    }}
                                />
                                <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Building / Apartment / Landmark</FormLabel>
                                        <FormControl>
                                            <Input placeholder="E.g. Green Towers, 3rd Floor, House 12..." className={theme.colors.ring} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <h3 className={cn("text-lg font-bold border-b pb-2", theme.colors.border, theme.colors.accent)}>3. Contact Info</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="customerName" render={({ field }) => (
                                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="John Doe" className={theme.colors.ring} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="07XX..."
                                            inputMode="numeric"
                                            maxLength={10}
                                            className={theme.colors.ring}
                                            {...field}
                                            onChange={(e) => field.onChange(normalizeKenyaPhone(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t md:static md:bg-transparent md:border-0 md:p-0 z-50">
                        <Button
                            type="submit"
                            disabled={isSubmitting || designImageUploading || busyOrdersPaused}
                            className={cn(
                                "w-full h-12 text-lg font-semibold rounded-full shadow-[0_18px_45px_-28px_rgba(15,20,40,0.6)] transition-all",
                                "hover:-translate-y-0.5 active:translate-y-0",
                                theme.colors.primary
                            )}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : busyOrdersPaused ? "Orders Paused" : "Review Order"}
                        </Button>
                    </div>
                    <div className="md:hidden h-16" />
                </form>
            </Form>
        </OrderLayout>
    )
}
