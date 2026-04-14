"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Clock } from "lucide-react"
import dynamic from "next/dynamic"

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
import {
  getDefaultSizeForCategory,
  getMenuCategoryLabel,
  getMenuCategoryOptions,
  getMenuItemDescription,
  getMenuItems,
  getMenuSizeOptions,
  getMenuUnitPrice,
  inferMenuCategory,
  isPizzaMenuCategory,
  type PizzaSideCategory,
} from "@/lib/pizza-pricing"
import { getPizzaOfferDetails, isPizzaOfferDay } from "@/lib/pizza-offer"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"
import { getNairobiHour, toNairobiDate } from "@/lib/time"
import type { StoreSettings } from "@/lib/store-settings"

const GPSLocationPicker = dynamic(() => import("@/components/GPSLocationPicker"), { ssr: false })

const MENU_CATEGORIES = ["pizza", "burger", "juice", "mocktail"] as const
const PIZZA_EXTRAS = [
  { key: "extraCheese", label: "Extra Cheese", price: 100 },
  { key: "extraToppings", label: "Extra Toppings", price: 100 },
] as const

const pizzaSchema = z
  .object({
    menuCategory: z.enum(MENU_CATEGORIES),
    menuItem: z.string().min(1, "Select an item"),
    menuSize: z.string().min(1, "Select an option"),
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
  })
  .refine((data) => {
    if (data.fulfilment === "delivery" && (!data.deliveryLat || !data.deliveryLng)) return false
    return true
  }, { message: "Delivery location required", path: ["fulfilment"] })

interface DeliveryZone {
  id: string
  name: string
  delivery_fee: number
  allows_pizza: boolean
}

type ReviewOrderItem = {
  name: string
  quantity: number
  size: string
  category?: PizzaSideCategory
  toppings?: string[]
  notes?: string
}

export function PizzaOrderForm({ zones: _zones, storeSettings }: { zones: DeliveryZone[]; storeSettings: StoreSettings }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const theme = orderThemes.pizza
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [minError, setMinError] = useState<string | null>(null)
  const [lateNightWarning, setLateNightWarning] = useState(false)
  const busyOrdersPaused = storeSettings.busyModeEnabled && storeSettings.busyModeAction === "disable_orders"
  const busyEtaMode = storeSettings.busyModeEnabled && storeSettings.busyModeAction === "increase_eta"

  const initialOrderRaw = searchParams.get("order")
  let initialOrder: any = null
  if (initialOrderRaw) {
    try {
      initialOrder = JSON.parse(decodeURIComponent(initialOrderRaw))
    } catch {
      initialOrder = null
    }
  }

  const orderItem = (initialOrder?.items?.[0] || null) as ReviewOrderItem | null
  const initialCategory = orderItem?.category || inferMenuCategory(orderItem?.name || "")
  const initialValues = orderItem
    ? {
        fulfilment: initialOrder.fulfilment || "pickup",
        menuCategory: initialCategory,
        menuItem: orderItem.name || "",
        menuSize: orderItem.size || getDefaultSizeForCategory(initialCategory),
        quantity: Number(orderItem.quantity || 1),
        customerName: initialOrder.customerName || "",
        phone: initialOrder.phone || "",
        notes: orderItem.notes || "",
        extraCheese: Array.isArray(orderItem.toppings) && orderItem.toppings.includes("Extra Cheese"),
        extraToppings: Array.isArray(orderItem.toppings) && orderItem.toppings.includes("Extra Toppings"),
        deliveryZoneId: initialOrder.deliveryZoneId || "",
        deliveryLat: initialOrder.deliveryLat,
        deliveryLng: initialOrder.deliveryLng,
        deliveryAddress: initialOrder.deliveryAddress || "",
        deliveryFee: initialOrder.deliveryFee,
        deliveryDistance: initialOrder.deliveryDistance,
      }
    : null

  const form = useForm<z.infer<typeof pizzaSchema>>({
    resolver: zodResolver(pizzaSchema),
    defaultValues: initialValues || {
      fulfilment: "pickup",
      menuCategory: "pizza",
      menuItem: "",
      menuSize: "Medium",
      quantity: 1,
      customerName: "",
      phone: "",
      notes: "",
      deliveryZoneId: "",
      extraCheese: false,
      extraToppings: false,
    },
  })

  const menuCategory = form.watch("menuCategory")
  const menuItem = form.watch("menuItem")
  const menuSize = form.watch("menuSize")
  const quantity = form.watch("quantity")
  const extraCheese = form.watch("extraCheese")
  const extraToppings = form.watch("extraToppings")
  const isPizzaOrder = isPizzaMenuCategory(menuCategory)
  const categoryItems = useMemo(() => getMenuItems(menuCategory), [menuCategory])
  const sizeOptions = useMemo(() => getMenuSizeOptions(menuCategory), [menuCategory])

  const extrasCount = isPizzaOrder ? (extraCheese ? 1 : 0) + (extraToppings ? 1 : 0) : 0
  const baseUnitPrice = menuSize && menuItem ? getMenuUnitPrice(menuCategory, menuSize, menuItem, extrasCount) : 0
  const totalQty = Number.isFinite(quantity) ? quantity : 1
  const rawSubtotal = baseUnitPrice * (totalQty || 1)
  const offerActive = isPizzaOrder && isPizzaOfferDay()
  const offerDetails = isPizzaOrder
    ? getPizzaOfferDetails({
        size: menuSize,
        quantity: totalQty || 1,
        unitPrice: baseUnitPrice,
      })
    : { discount: 0, isEligible: false, chargeableQuantity: totalQty || 1, freeQuantity: 0 }
  const extrasTotal = extrasCount * 100
  const estimatedPrice = rawSubtotal - offerDetails.discount
  const selectedDescription = menuItem ? getMenuItemDescription(menuCategory, menuItem) : ""

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [])

  useEffect(() => {
    const now = toNairobiDate(new Date())
    const isAfterCutoff =
      now.getHours() > 21 || (now.getHours() === 21 && (now.getMinutes() > 0 || now.getSeconds() > 0))
    setLateNightWarning(isAfterCutoff)
  }, [])

  useEffect(() => {
    const currentItem = form.getValues("menuItem")
    const currentSize = form.getValues("menuSize")
    const nextItem = categoryItems[0]?.name || ""
    const nextSize = sizeOptions[0]?.value || "Regular"

    if (!categoryItems.some((item) => item.name === currentItem)) {
      form.setValue("menuItem", nextItem, { shouldValidate: true })
    }

    if (!sizeOptions.some((option) => option.value === currentSize)) {
      form.setValue("menuSize", nextSize, { shouldValidate: true })
    }

    if (!isPizzaOrder) {
      form.setValue("extraCheese", false)
      form.setValue("extraToppings", false)
    }
  }, [categoryItems, form, isPizzaOrder, sizeOptions])

  async function onSubmit(values: z.infer<typeof pizzaSchema>) {
    if (busyOrdersPaused) {
      setMinError(storeSettings.busyModeMessage || "Orders are temporarily paused due to high kitchen load.")
      return
    }

    setIsSubmitting(true)
    setMinError(null)

    try {
      const toppings = isPizzaMenuCategory(values.menuCategory)
        ? [
            ...(values.extraCheese ? ["Extra Cheese"] : []),
            ...(values.extraToppings ? ["Extra Toppings"] : []),
          ]
        : []

      const orderData = {
        type: "pizza",
        items: [
          {
            name: values.menuItem,
            quantity: values.quantity,
            size: values.menuSize,
            category: values.menuCategory,
            toppings,
            notes: values.notes,
          },
        ],
        deliveryFee: values.fulfilment === "delivery" ? values.deliveryFee || 0 : 0,
        fulfilment: values.fulfilment,
        deliveryZone: values.fulfilment === "delivery" ? `GPS Delivery (${values.deliveryDistance}km)` : "",
        deliveryZoneId: null,
        deliveryLat: values.deliveryLat,
        deliveryLng: values.deliveryLng,
        deliveryAddress: values.deliveryAddress,
        deliveryDistance: values.deliveryDistance,
        customerName: values.customerName,
        placedHour: getNairobiHour(),
        phone: values.phone,
      }

      router.push(`/order/review?order=${encodeURIComponent(JSON.stringify(orderData))}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <OrderLayout
      theme={theme}
      title="Order Pizza & More"
      subtitle="Pizzas, burgers, juices, and mocktails from the same kitchen, all in one checkout."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <section
            className={cn(
              "overflow-hidden rounded-[26px] border bg-white/80 shadow-[0_22px_55px_-40px_rgba(15,20,40,0.4)]",
              theme.colors.border
            )}
          >
            <div className="relative h-52 w-full md:h-60">
              <Image
                src="/shop-pizza.jpg"
                alt="Japhe's pizza shop interior"
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/80">Kitchen Menu</p>
                <h3 className="mt-1 text-lg font-semibold">Pizza, burgers, juices, and mocktails from our Thika branch</h3>
              </div>
            </div>
          </section>

          {lateNightWarning && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">Late night order notice</p>
                <p className="text-xs text-amber-700/80">
                  We stop taking orders at 9 PM. Call us if you need a special exception.
                </p>
              </div>
            </div>
          )}

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
              <p className="mt-1 text-xs">Expect around +{storeSettings.busyModeExtraMinutes} minutes on prep and delivery windows.</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className={cn("text-lg font-bold", theme.colors.accent)}>1. Menu Selection</h3>
              {estimatedPrice > 0 && (
                <span className="text-xl font-bold text-orange-600 sm:text-right">{estimatedPrice.toLocaleString()} KES</span>
              )}
            </div>

            {baseUnitPrice > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{rawSubtotal.toLocaleString()} KES</span>
                </div>
                {offerDetails.discount > 0 && (
                  <div className="mt-1 flex items-center justify-between text-emerald-600">
                    <span>Offer discount</span>
                    <span>-{offerDetails.discount.toLocaleString()} KES</span>
                  </div>
                )}
                {extrasCount > 0 && (
                  <div className="mt-1 flex items-center justify-between">
                    <span>Extras</span>
                    <span>{(extrasTotal * totalQty).toLocaleString()} KES</span>
                  </div>
                )}
                {offerDetails.isEligible && (
                  <p className="mt-2 text-[11px] text-emerald-700">
                    2-for-1 applied: pay for {offerDetails.chargeableQuantity} of {totalQty}.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Choose an item and option to see the estimate.</p>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Pizza Offer Days</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">2-for-1 Tuesdays & Thursdays</p>
                  <p className="text-xs text-slate-600">Medium & Large pizzas only. Burgers and drinks stay at regular price.</p>
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                    offerActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {offerActive ? "Offer Active Today" : "Pizza Offer Days"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">Pizza only</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Medium / Large</span>
              </div>
            </div>

            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Pizza pie from Ksh 350, burgers from Ksh 250, juices from Ksh 150, mocktails from Ksh 350
            </p>

            <FormField
              control={form.control}
              name="menuCategory"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Menu Category</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as PizzaSideCategory)}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      {getMenuCategoryOptions().map((option) => (
                        <FormItem
                          key={option.value}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                            field.value === option.value
                              ? "border-[var(--brand-blue)] bg-[rgba(58,78,216,0.08)]"
                              : "border-slate-200 bg-white/70"
                          )}
                        >
                          <FormControl>
                            <RadioGroupItem value={option.value} />
                          </FormControl>
                          <div>
                            <FormLabel className="font-semibold">{option.label}</FormLabel>
                            <p className="text-xs text-slate-500">
                              {option.value === "pizza"
                                ? "Pizza pies and full-size pizzas"
                                : option.value === "burger"
                                  ? "Fresh burgers with side fries"
                                  : option.value === "juice"
                                    ? "Fresh fruit juices"
                                    : "Non-alcoholic mocktails"}
                            </p>
                          </div>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="menuItem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getMenuCategoryLabel(menuCategory)} Item</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={theme.colors.ring}>
                        <SelectValue placeholder={`Select ${getMenuCategoryLabel(menuCategory).toLowerCase()} item`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryItems.map((item) => (
                        <SelectItem key={item.name} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDescription ? <p className="mt-2 text-xs text-slate-500">{selectedDescription}</p> : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="menuSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isPizzaOrder ? "Size" : "Option"}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={theme.colors.ring}>
                          <SelectValue placeholder={isPizzaOrder ? "Select size" : "Select option"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sizeOptions.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label} - {size.meta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} className={theme.colors.ring} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isPizzaOrder && (
              <div className="grid gap-3 sm:grid-cols-2">
                {PIZZA_EXTRAS.map((extra) => (
                  <FormField
                    key={extra.key}
                    control={form.control}
                    name={extra.key}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
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
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        isPizzaOrder
                          ? "Extra spicy, no onions, cut into slices..."
                          : "Any serving or preparation note for the kitchen..."
                      }
                      className={theme.colors.ring}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <h3 className={cn("border-b pb-2 text-lg font-bold", theme.colors.border, theme.colors.accent)}>2. Delivery</h3>

            <FormField
              control={form.control}
              name="fulfilment"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Method</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid gap-3 sm:grid-cols-2">
                      <FormItem
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                          field.value === "pickup"
                            ? "border-[var(--brand-blue)] bg-[rgba(58,78,216,0.08)]"
                            : "border-slate-200 bg-white/70"
                        )}
                      >
                        <FormControl>
                          <RadioGroupItem value="pickup" />
                        </FormControl>
                        <div>
                          <FormLabel className="font-semibold">Pickup (Thika)</FormLabel>
                          <p className="text-xs text-slate-500">Ready in ~30 mins</p>
                        </div>
                      </FormItem>

                      <FormItem
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                          field.value === "delivery"
                            ? "border-[var(--brand-blue)] bg-[rgba(58,78,216,0.08)]"
                            : "border-slate-200 bg-white/70"
                        )}
                      >
                        <FormControl>
                          <RadioGroupItem value="delivery" />
                        </FormControl>
                        <div>
                          <FormLabel className="font-semibold">Delivery</FormLabel>
                          <p className="text-xs text-slate-500">GPS-based pricing</p>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("fulfilment") === "delivery" && (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
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
                        form.setValue("deliveryLng", undefined)
                        form.setValue("deliveryFee", 0)
                        form.setValue("deliveryDistance", undefined)
                      }
                    }}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building / Apartment / Landmark</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="E.g. Green Towers, 3rd Floor, House 12..."
                          className={theme.colors.ring}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {minError ? <p className="text-sm font-medium text-red-600">{minError}</p> : null}
          </div>

          <div className="space-y-6">
            <h3 className={cn("border-b pb-2 text-lg font-bold", theme.colors.border, theme.colors.accent)}>3. Contact Info</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className={theme.colors.ring} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="07XX..."
                        inputMode="numeric"
                        maxLength={10}
                        className={theme.colors.ring}
                        {...field}
                        onChange={(event) => field.onChange(normalizeKenyaPhone(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 md:static md:border-0 md:bg-transparent md:p-0">
            <Button
              type="submit"
              disabled={isSubmitting || busyOrdersPaused}
              aria-disabled={isSubmitting || busyOrdersPaused}
              className={cn(
                "h-12 w-full rounded-full text-lg font-semibold shadow-[0_18px_45px_-28px_rgba(15,20,40,0.6)] transition-all",
                "hover:-translate-y-0.5 active:translate-y-0",
                theme.colors.primary
              )}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : busyOrdersPaused ? "Orders Paused" : "Review Order"}
            </Button>
          </div>
          <div className="h-16 md:hidden" />
        </form>
      </Form>
    </OrderLayout>
  )
}
