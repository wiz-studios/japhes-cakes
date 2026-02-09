"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2 } from "lucide-react"
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
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryZoneId: z.string().optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    deliveryAddress: z.string().optional(),
    deliveryFee: z.number().optional(),
    deliveryDistance: z.number().optional(),
    preferredDate: z.date({ required_error: "Date required" }),
    customerName: z.string().min(2, "Min 2 chars"),
    phone: z.string().min(10, "Valid phone req"),
}).refine((data) => {
    // Custom validation: Require location coords if delivery is selected
    if (data.fulfilment === "delivery" && (!data.deliveryLat || !data.deliveryLng)) return false
    return true
}, { message: "Delivery location required", path: ["fulfilment"] })

interface DeliveryZone {
    id: string; name: string; delivery_fee: number; allows_cake: boolean;
}

// Pricing Constants used for real-time estimation
const CAKE_PRICES: Record<string, number> = {
    "1kg": 2500,
    "1.5kg": 3700,
    "2kg": 4800,
    "3kg": 7000
}

const FLAVOR_SURCHARGES: Record<string, number> = {
    "Vanilla": 0, "Lemon": 0, "Fruit": 0,
    "Chocolate": 500, "Red Velvet": 500, "Black Forest": 500, "Blueberry": 500
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
export function CakeOrderForm({ zones }: { zones: DeliveryZone[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const theme = orderThemes.cake
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [dateOpen, setDateOpen] = useState(false)

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
        deliveryZoneId: rawOrder.deliveryZoneId || "", // Might be missing if not passed back, user selects again
        preferredDate: rawOrder.scheduledDate ? new Date(rawOrder.scheduledDate) : undefined,
    } : (rawOrder || {
        fulfilment: "pickup", cakeSize: "", cakeFlavor: "", customerName: "", phone: "",
        designNotes: "", cakeMessage: "", deliveryZoneId: "",
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
            deliveryZoneId: "",
            ...defaultValues
        },
    })

    // Watch values for real-time pricing display
    const watchSize = form.watch("cakeSize")
    const watchFlavor = form.watch("cakeFlavor")

    const basePrice = CAKE_PRICES[watchSize] || 0
    const surcharge = FLAVOR_SURCHARGES[watchFlavor] || 0
    const estimatedTotal = basePrice + surcharge

    /**
     * Form Submission Handler
     * Constructs the order data object and redirects to the review page.
     */
    async function onSubmit(values: z.infer<typeof cakeSchema>) {
        setIsSubmitting(true)
        const orderData = {
            type: "cake",
            items: [{
                name: `${values.cakeFlavor} Cake`,
                quantity: 1,
                size: values.cakeSize,
                flavor: values.cakeFlavor,
                notes: values.designNotes,
                message: values.cakeMessage,
                price: CAKE_PRICES[values.cakeSize] + (FLAVOR_SURCHARGES[values.cakeFlavor] || 0)
            }],
            total: CAKE_PRICES[values.cakeSize] + (FLAVOR_SURCHARGES[values.cakeFlavor] || 0),
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
            placedHour: new Date().getHours(),
            phone: values.phone,
        }
        router.push(`/order/review?order=${encodeURIComponent(JSON.stringify(orderData))}`)
    }

    return (
        <OrderLayout theme={theme} title="Design Your Cake" subtitle="Customize every detail.">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                            <SelectItem value="1kg">1 KG (2,500 KES)</SelectItem>
                                            <SelectItem value="1.5kg">1.5 KG (3,700 KES)</SelectItem>
                                            <SelectItem value="2kg">2 KG (4,800 KES)</SelectItem>
                                            <SelectItem value="3kg">3 KG (7,000 KES)</SelectItem>
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
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Standard (No Charge)</div>
                                            {["Vanilla", "Lemon", "Fruit"].map(f => (
                                                <SelectItem key={f} value={f}>{f}</SelectItem>
                                            ))}

                                            {/* Premium Flavors */}
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Premium (+500 KES)</div>
                                            {["Chocolate", "Red Velvet", "Black Forest", "Blueberry"].map(f => (
                                                <SelectItem key={f} value={f}>{f} (+500)</SelectItem>
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
                                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="07XX..." className={theme.colors.ring} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t md:static md:bg-transparent md:border-0 md:p-0 z-50">
                        <Button type="submit" disabled={isSubmitting} className={cn("w-full h-12 text-lg font-bold rounded-xl shadow-lg transition-all", theme.colors.primary)}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Review Order"}
                        </Button>
                    </div>
                    <div className="md:hidden h-16" />
                </form>
            </Form>
        </OrderLayout>
    )
}
