"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { OrderLayout } from "./OrderLayout"
import { orderThemes } from "./themes"

import dynamic from "next/dynamic"

// Dynamically import GPS Picker to avoid SSR issues with Leaflet
const GPSLocationPicker = dynamic(() => import('@/components/GPSLocationPicker'), { ssr: false })

const pizzaSchema = z.object({
    pizzaType: z.string().min(1, "Select pizza"),
    pizzaSize: z.string().min(1, "Select size"),
    quantity: z.coerce.number().min(1).max(20),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryZoneId: z.string().optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    deliveryAddress: z.string().optional(),
    deliveryFee: z.number().optional(),
    deliveryDistance: z.number().optional(),
    customerName: z.string().min(2, "Name req"),
    phone: z.string().min(10, "Phone req"),
    notes: z.string().optional(),
}).refine((data) => {
    if (data.fulfilment === "delivery" && (!data.deliveryLat || !data.deliveryLng)) return false
    return true
}, { message: "Delivery location required", path: ["fulfilment"] })

// Pizza pricing matrix
const PIZZA_BASE_PRICES: Record<string, number> = {
    "Small": 700,
    "Medium": 1000,
    "Large": 1500
}

// Premium pizza types have surcharge
const PIZZA_TYPE_SURCHARGES: Record<string, number> = {
    "Margherita": 0,
    "Vegetarian": 0,
    "BBQ Chicken": 200,
    "Chicken Periperi": 200,
    "Beef & Onion": 200,
    "Everything Meat": 300,
    "Hawaiian": 150,
    "Boerewors": 250,
    "Chicken Mushroom": 200,
}

interface DeliveryZone {
    id: string; name: string; delivery_fee: number; allows_pizza: boolean;
}

export function PizzaOrderForm({ zones }: { zones: DeliveryZone[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const theme = orderThemes.pizza
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [minError, setMinError] = useState<string | null>(null)
    const [lateNightWarning, setLateNightWarning] = useState(false)

    const initialOrder = searchParams.get("order") ? JSON.parse(decodeURIComponent(searchParams.get("order")!)) : null

    const form = useForm<z.infer<typeof pizzaSchema>>({
        resolver: zodResolver(pizzaSchema),
        defaultValues: initialOrder || {
            fulfilment: "pickup", pizzaType: "", pizzaSize: "Medium", quantity: 1, customerName: "", phone: "",
            notes: "", deliveryZoneId: "",
        },
    })

    // Watch for price changes
    const pizzaType = form.watch("pizzaType")
    const pizzaSize = form.watch("pizzaSize")
    const quantity = form.watch("quantity")

    // Calculate real-time price
    const calculatePrice = () => {
        if (!pizzaSize || !pizzaType) return 0
        const basePrice = PIZZA_BASE_PRICES[pizzaSize] || 1000
        const typeSurcharge = PIZZA_TYPE_SURCHARGES[pizzaType] || 0
        return (basePrice + typeSurcharge) * (quantity || 1)
    }

    const estimatedPrice = calculatePrice()

    useEffect(() => {
        const now = new Date()
        const cutoff = new Date(); cutoff.setHours(21, 0, 0, 0)
        setLateNightWarning(now > cutoff)
    }, [])

    async function onSubmit(values: z.infer<typeof pizzaSchema>) {
        setIsSubmitting(true); setMinError(null)
        try {
            // Nairobi/Min value check could be re-implemented here if we reverse-geocoded "Nairobi",
            // but for now we rely on the strict fee structure.

            const orderData = {
                type: "pizza",
                items: [{
                    name: values.pizzaType,
                    quantity: values.quantity,
                    size: values.pizzaSize,
                    toppings: [],
                    notes: values.notes
                }],
                deliveryFee: values.fulfilment === "delivery" ? (values.deliveryFee || 0) : 0,
                fulfilment: values.fulfilment,
                deliveryZone: values.fulfilment === "delivery" ? `GPS Delivery (${values.deliveryDistance}km)` : "",
                deliveryZoneId: null, // Legacy field cleared
                deliveryLat: values.deliveryLat,
                deliveryLng: values.deliveryLng,
                deliveryAddress: values.deliveryAddress, // Instructions
                deliveryDistance: values.deliveryDistance,
                customerName: values.customerName,
                placedHour: new Date().getHours(),
                phone: values.phone,
            }
            router.push(`/order/review?order=${encodeURIComponent(JSON.stringify(orderData))}`)
        } catch (e) { setIsSubmitting(false) }
    }

    return (
        <OrderLayout theme={theme} title="Build Your Pizza" subtitle="Hot, fresh, and made to order.">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {lateNightWarning && (
                        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4">
                            <p className="font-bold">Late Night Order?</p>
                            <p>We stop taking orders at 9 PM. Call us if strict.</p>
                        </div>
                    )}

                    {/* Price Display */}
                    {estimatedPrice > 0 && (
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 p-4 mb-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-orange-800">Estimated Total</p>
                                <p className="text-sm text-orange-600">
                                    {pizzaSize} {pizzaType} × {quantity}
                                </p>
                            </div>
                            <div className="text-3xl font-bold text-orange-700">
                                {estimatedPrice.toLocaleString()} KES
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <h3 className={cn("text-lg font-bold border-b pb-2", theme.colors.border, theme.colors.accent)}>1. Pizza Selection</h3>
                        <FormField control={form.control} name="pizzaType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Flavor</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className={theme.colors.ring}><SelectValue placeholder="Select Pizza" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {["BBQ Chicken", "Chicken Periperi", "Beef & Onion", "Everything Meat", "Hawaiian", "Boerewors", "Chicken Mushroom", "Vegetarian", "Margherita"].map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-6">
                            <FormField control={form.control} name="pizzaSize" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Size</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className={theme.colors.ring}><SelectValue placeholder="Size" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Small">Small</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Large">Large</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="quantity" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl><Input type="number" min={1} className={theme.colors.ring} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Special Instructions</FormLabel><FormControl><Input placeholder="Less cheese, spicy..." className={theme.colors.ring} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <div className="space-y-6">
                        <h3 className={cn("text-lg font-bold border-b pb-2", theme.colors.border, theme.colors.accent)}>2. Delivery</h3>
                        <FormField control={form.control} name="fulfilment" render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Method</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="pickup" /></FormControl><FormLabel>Pickup</FormLabel></FormItem>
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
                        {minError && <p className="text-red-600 text-sm font-medium">{minError}</p>}
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
