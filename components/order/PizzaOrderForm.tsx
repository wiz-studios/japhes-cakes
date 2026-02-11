"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Sparkles, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { OrderLayout } from "./OrderLayout"
import { orderThemes } from "./themes"
import { getPizzaUnitPrice } from "@/lib/pizza-pricing"
import { getPizzaOfferDetails, isPizzaOfferDay } from "@/lib/pizza-offer"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"

import dynamic from "next/dynamic"

// Dynamically import GPS Picker to avoid SSR issues with Leaflet
const GPSLocationPicker = dynamic(() => import('@/components/GPSLocationPicker'), { ssr: false })

const PIZZA_TYPES = [
    "Margherita",
    "Vegetarian",
    "Beef Supreme",
    "Hawaiian",
    "Meat Deluxe",
    "BBQ Steak",
    "BBQ Chicken",
    "Chicken Periperi",
    "Chicken Tikka",
    "Chicken Supreme",
    "Chicken Macon",
]


const PIZZA_SIZES = [
    { value: "Test", label: "Test Item", meta: "Ksh 10 (STK test)" },
    { value: "Pizza Pie", label: "Pizza Pie", meta: "Ksh 350" },
    { value: "Small", label: "Small", meta: "Personal" },
    { value: "Medium", label: "Medium", meta: "2-3 people" },
    { value: "Large", label: "Large", meta: "4-5 people" },
]

const PIZZA_EXTRAS = [
    { key: "extraCheese", label: "Extra Cheese", price: 100 },
    { key: "extraToppings", label: "Extra Toppings", price: 100 },
] as const

const PIZZA_DESCRIPTIONS: Record<string, string> = {
    Margherita: "Classic tomato base and cheese.",
    Vegetarian: "Tomatoes, onions, green pepper & chills.",
    "Beef Supreme": "Marinated beef, pineapples, cheese.",
    Hawaiian: "Pineapples, bacon & cheese.",
    "Meat Deluxe": "Beef, macon, ham, pepperoni.",
    "BBQ Steak": "Marinated beef.",
    "BBQ Chicken": "Marinated chicken & cheese.",
    "Chicken Periperi": "The heat with its bold flavors! Tender & cheese.",
    "Chicken Tikka": "Marinated mild chicken, olives, bell pepper & cheese.",
    "Chicken Supreme": "Marinated chicken & pineapples.",
    "Chicken Macon": "Marinated chicken, macon, onions & sweetcorn.",
}

/**
 * Zod schema for validating pizza order inputs.
 * Ensures quantity, size, and type selection, plus delivery details if applicable.
 */
const pizzaSchema = z.object({
    pizzaType: z.string().min(1, "Select pizza"),
    pizzaSize: z.string().min(1, "Select size"),
    quantity: z.coerce.number().min(1).max(20),
    extraCheese: z.boolean().optional(),
    extraToppings: z.boolean().optional(),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryZoneId: z.string().optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    deliveryAddress: z.string().optional(),
    deliveryFee: z.number().optional(),
    deliveryDistance: z.number().optional(),
    customerName: z.string().min(2, "Name req"),
    phone: z.string().regex(KENYA_PHONE_REGEX, "Use 07XXXXXXXX or 01XXXXXXXX"),
    notes: z.string().optional(),
}).refine((data) => {
    // Require precise location for delivery
    if (data.fulfilment === "delivery" && (!data.deliveryLat || !data.deliveryLng)) return false
    return true
}, { message: "Delivery location required", path: ["fulfilment"] })

interface DeliveryZone {
    id: string; name: string; delivery_fee: number; allows_pizza: boolean;
}

/**
 * PizzaOrderForm Component
 * 
 * Handles pizza selection, customization (notes), and delivery/pickup choice.
 * 
 * Features:
 * - Real-time price calculation including surcharges.
 * - Late-night warning (after 9 PM).
 * - GPS Delivery support.
 */
export function PizzaOrderForm({ zones }: { zones: DeliveryZone[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const theme = orderThemes.pizza
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [minError, setMinError] = useState<string | null>(null)
    const [lateNightWarning, setLateNightWarning] = useState(false)

    // Load existing order from URL query if present (for editing from Review page)
    const initialOrder = searchParams.get("order") ? JSON.parse(decodeURIComponent(searchParams.get("order")!)) : null

    const form = useForm<z.infer<typeof pizzaSchema>>({
        resolver: zodResolver(pizzaSchema),
        defaultValues: initialOrder || {
            fulfilment: "pickup", pizzaType: "", pizzaSize: "Medium", quantity: 1, customerName: "", phone: "",
            notes: "", deliveryZoneId: "", extraCheese: false, extraToppings: false,
        },
    })

    // Watch for price changes
    const pizzaType = form.watch("pizzaType")
    const pizzaSize = form.watch("pizzaSize")
    const quantity = form.watch("quantity")
    const extraCheese = form.watch("extraCheese")
    const extraToppings = form.watch("extraToppings")

    const extrasCount = (extraCheese ? 1 : 0) + (extraToppings ? 1 : 0)
    const baseUnitPrice = pizzaSize && pizzaType ? getPizzaUnitPrice(pizzaSize, pizzaType, extrasCount) : 0
    const totalQty = Number.isFinite(quantity) ? quantity : 1
    const rawSubtotal = baseUnitPrice * (totalQty || 1)
    const offerActive = isPizzaOfferDay()
    const offerDetails = getPizzaOfferDetails({
        size: pizzaSize,
        quantity: totalQty || 1,
        unitPrice: baseUnitPrice,
    })
    const extrasTotal = extrasCount * 100
    const estimatedPrice = rawSubtotal - offerDetails.discount

    // Check for late night orders
    useEffect(() => {
        const now = new Date()
        const cutoff = new Date(); cutoff.setHours(21, 0, 0, 0)
        setLateNightWarning(now > cutoff)
    }, [])

    /**
     * Handle form submission
     * Packs data into standard order format and forwards to review page.
     */
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
                    toppings: [
                        ...(values.extraCheese ? ["Extra Cheese"] : []),
                        ...(values.extraToppings ? ["Extra Toppings"] : []),
                    ],
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
                    <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
                        <div className={cn("rounded-[26px] border bg-white/80 p-6 shadow-[0_24px_60px_-42px_rgba(15,20,40,0.45)]", theme.colors.border)}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(58,78,216,0.12)] text-[var(--brand-blue-deep)]">
                                        <Sparkles className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Pizza Offer Days</p>
                                        <h3 className="text-lg font-semibold text-slate-900">2-for-1 Tuesdays & Thursdays</h3>
                                        <p className="text-sm text-slate-600">Medium & Large only. Order two, pay for one.</p>
                                    </div>
                                </div>
                                <span className={cn(
                                    "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                                    offerActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                )}>
                                    {offerActive ? "Offer Active Today" : "Next Tue/Thu"}
                                </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                                <span className="rounded-full bg-slate-100 px-3 py-1">Buy 1 Get 1</span>
                                <span className="rounded-full bg-slate-100 px-3 py-1">Medium / Large</span>
                            </div>
                        </div>

                        <div className={cn("rounded-[26px] border bg-white/80 p-6 shadow-[0_24px_60px_-42px_rgba(15,20,40,0.45)]", theme.colors.border)}>
                            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Estimated Total</p>
                            {estimatedPrice > 0 ? (
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <p className="text-sm text-slate-600">{pizzaSize} {pizzaType} x {quantity}</p>
                                        {extrasTotal > 0 && (
                                            <p className="text-xs text-slate-500 mt-1">Extras: + {extrasTotal.toLocaleString()} KES</p>
                                        )}
                                        {offerDetails.discount > 0 && (
                                            <p className="text-xs text-emerald-700 mt-1">
                                                Offer applied: {offerDetails.freeQuantity} free pizza{offerDetails.freeQuantity > 1 ? "s" : ""} (-{offerDetails.discount.toLocaleString()} KES)
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="text-sm text-slate-500">
                                            {offerDetails.discount > 0 && (
                                                <span className="line-through">{rawSubtotal.toLocaleString()} KES</span>
                                            )}
                                        </div>
                                        <div className="text-3xl font-bold text-[var(--brand-blue-deep)]">
                                            {estimatedPrice.toLocaleString()} KES
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-slate-500">
                                    Choose your pizza and size to see the estimate.
                                </p>
                            )}
                        </div>
                    </div>

                    {lateNightWarning && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 shadow-sm flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                <Clock className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="font-semibold">Late night order notice</p>
                                <p className="text-xs text-amber-700/80">We stop taking orders at 9 PM. Call us if you need a special exception.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6">
                        <section className={cn("rounded-[26px] border bg-white/80 p-6 md:p-7 shadow-[0_22px_55px_-40px_rgba(15,20,40,0.4)]", theme.colors.border)}>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Step 1</p>
                                    <h3 className={cn("text-lg font-semibold", theme.colors.accent)}>Pizza Selection</h3>
                                </div>
                                {baseUnitPrice > 0 && (
                                    <span className="text-sm font-semibold text-slate-600">
                                        {baseUnitPrice.toLocaleString()} KES / pizza
                                    </span>
                                )}
                            </div>

                            <div className="mt-5 grid gap-5">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    Pizza pie from Ksh 350 — test item Ksh 10 available for STK checks
                                </p>
                                <FormField control={form.control} name="pizzaType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Flavor</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className={theme.colors.ring}><SelectValue placeholder="Select Pizza" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {PIZZA_TYPES.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {pizzaType && PIZZA_DESCRIPTIONS[pizzaType] && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        {PIZZA_DESCRIPTIONS[pizzaType]}
                                    </p>
                                )}
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormField control={form.control} name="pizzaSize" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Size</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className={theme.colors.ring}><SelectValue placeholder="Size" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {PIZZA_SIZES.map((size) => (
                                                        <SelectItem key={size.value} value={size.value}>
                                                            {size.label} - {size.meta}
                                                        </SelectItem>
                                                    ))}
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

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {PIZZA_EXTRAS.map((extra) => (
                                        <FormField
                                            key={extra.key}
                                            control={form.control}
                                            name={extra.key}
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={(val) => field.onChange(Boolean(val))}
                                                        />
                                                    </FormControl>
                                                    <div className="flex-1">
                                                        <FormLabel className="font-semibold">{extra.label}</FormLabel>
                                                        <p className="text-xs text-slate-500">+ Ksh {extra.price}</p>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>

                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Special Instructions</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Extra cheese, spicy, no onions..." className={theme.colors.ring} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </section>

                        <section className={cn("rounded-[26px] border bg-white/80 p-6 md:p-7 shadow-[0_22px_55px_-40px_rgba(15,20,40,0.4)]", theme.colors.border)}>
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Step 2</p>
                                    <h3 className={cn("text-lg font-semibold", theme.colors.accent)}>Delivery</h3>
                                </div>
                                <span className="text-xs text-slate-500">Fee auto-calculates with GPS</span>
                            </div>

                            <div className="mt-5 space-y-5">
                                <FormField control={form.control} name="fulfilment" render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Method</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid gap-3 sm:grid-cols-2">
                                                <FormItem className={cn(
                                                    "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                                                    field.value === "pickup"
                                                        ? "border-[var(--brand-blue)] bg-[rgba(58,78,216,0.08)]"
                                                        : "border-slate-200 bg-white/70"
                                                )}>
                                                    <FormControl><RadioGroupItem value="pickup" /></FormControl>
                                                    <div>
                                                        <FormLabel className="font-semibold">Pickup (Thika)</FormLabel>
                                                        <p className="text-xs text-slate-500">Ready in ~30 mins</p>
                                                    </div>
                                                </FormItem>
                                                <FormItem className={cn(
                                                    "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                                                    field.value === "delivery"
                                                        ? "border-[var(--brand-blue)] bg-[rgba(58,78,216,0.08)]"
                                                        : "border-slate-200 bg-white/70"
                                                )}>
                                                    <FormControl><RadioGroupItem value="delivery" /></FormControl>
                                                    <div>
                                                        <FormLabel className="font-semibold">Delivery</FormLabel>
                                                        <p className="text-xs text-slate-500">GPS-based pricing</p>
                                                    </div>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {form.watch("fulfilment") === "delivery" && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <FormLabel>Where are we delivering?</FormLabel>
                                        <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
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
                                        </div>
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
                        </section>

                        <section className={cn("rounded-[26px] border bg-white/80 p-6 md:p-7 shadow-[0_22px_55px_-40px_rgba(15,20,40,0.4)]", theme.colors.border)}>
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Step 3</p>
                                    <h3 className={cn("text-lg font-semibold", theme.colors.accent)}>Contact Info</h3>
                                </div>
                                <span className="text-xs text-slate-500">We&apos;ll confirm by call</span>
                            </div>
                            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField control={form.control} name="customerName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl><Input placeholder="John Doe" className={theme.colors.ring} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
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
                        </section>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t md:static md:bg-transparent md:border-0 md:p-0 z-50">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className={cn(
                                "w-full h-12 text-lg font-semibold rounded-full shadow-[0_18px_45px_-28px_rgba(15,20,40,0.6)] transition-all",
                                "hover:-translate-y-0.5 active:translate-y-0",
                                theme.colors.primary
                            )}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Review Order"}
                        </Button>
                    </div>
                    <div className="md:hidden h-16" />
                </form>
            </Form>
        </OrderLayout>
    )
}
