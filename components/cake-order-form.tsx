"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format, addHours, isBefore, startOfToday } from "date-fns"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { submitCakeOrder } from "@/app/actions/orders"
import { CAKE_FLAVORS, CAKE_SIZES, getCakeDisplayName, getCakePrice } from "@/lib/cake-pricing"

const cakeSchema = z
  .object({
    cakeSize: z.string().min(1, "Please select a size"),
    cakeFlavor: z.string().min(1, "Please select a flavor"),
    designNotes: z.string().optional(),
    cakeMessage: z.string().optional(),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryZoneId: z.string().optional(),
    preferredDate: z.date({
      required_error: "A preferred date is required.",
    }),
    customerName: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().regex(KENYA_PHONE_REGEX, "Use 07XXXXXXXX or 01XXXXXXXX"),
  })
  .refine(
    (data) => {
      if (data.fulfilment === "delivery" && !data.deliveryZoneId) return false
      return true
    },
    {
      message: "Delivery zone is required for delivery orders",
      path: ["deliveryZoneId"],
    },
  )

interface DeliveryZone {
  id: string
  name: string
  delivery_fee: number
  scheduled_only: boolean
  allows_pizza: boolean
  allows_cake: boolean
}

export function CakeOrderForm({ zones }: { zones: DeliveryZone[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dateOpen, setDateOpen] = useState(false)


  // Support pre-filling form from router state (for back navigation)
  const initialOrder = searchParams.get("order") ? JSON.parse(decodeURIComponent(searchParams.get("order")!)) : null

  const form = useForm<z.infer<typeof cakeSchema>>({
    resolver: zodResolver(cakeSchema),
    defaultValues: initialOrder || {
      fulfilment: "pickup",
      cakeSize: "",
      cakeFlavor: "",
      customerName: "",
      phone: "",
    },
  })

  async function onSubmit(values: z.infer<typeof cakeSchema>) {
    setIsSubmitting(true)
    try {
      // Instead of submitting, redirect to review page with order data
      const orderData = {
        type: "cake",
        items: [
          {
            name: getCakeDisplayName(values.cakeFlavor),
            quantity: 1,
            size: values.cakeSize,
            flavor: values.cakeFlavor,
            notes: values.designNotes,
            message: values.cakeMessage,
          },
        ],
        deliveryFee: zones.find((z) => z.id === values.deliveryZoneId)?.delivery_fee || 0,
        fulfilment: values.fulfilment,
        deliveryZone: zones.find((z) => z.id === values.deliveryZoneId)?.name || "",
        total: getCakePrice(values.cakeFlavor, values.cakeSize),
        scheduledDate: values.preferredDate ? values.preferredDate.toISOString().slice(0, 10) : "",
        placedHour: new Date().getHours(),
        phone: values.phone,
      }
      router.push(`/order/review?order=${encodeURIComponent(JSON.stringify(orderData))}`)
    } catch (error) {
      alert("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const minDate = addHours(new Date(), 24)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-sm">
          <strong>Note:</strong> Nairobi deliveries are scheduled only. Cake orders require a deposit confirmation via
          WhatsApp after submission.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cakeSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cake Size</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CAKE_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>{size.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cakeFlavor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cake Flavor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select flavor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CAKE_FLAVORS.map((flavor) => (
                      <SelectItem key={flavor} value={flavor}>{flavor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="designNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Design Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any specific colors or themes?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cakeMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message on Cake</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Happy Birthday John!" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-bold">Fulfilment Details</h3>

          <FormField
            control={form.control}
            name="fulfilment"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>How will you get your cake?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="pickup" />
                      </FormControl>
                      <FormLabel className="font-normal">Pickup from Thika Shop</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="delivery" />
                      </FormControl>
                      <FormLabel className="font-normal">Delivery</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("fulfilment") === "delivery" && (
            <FormField
              control={form.control}
              name="deliveryZoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Zone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your zone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name} (+KES {zone.delivery_fee})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="preferredDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Preferred Date</FormLabel>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
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
                      disabled={(date) => isBefore(date, startOfToday()) || isBefore(date, minDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Earliest available date is {format(minDate, "PPP")}.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-bold">Contact Information</h3>
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full Name" {...field} />
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
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0712 345 678"
                      inputMode="numeric"
                      maxLength={10}
                      {...field}
                      onChange={(e) => field.onChange(normalizeKenyaPhone(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" className="w-full py-6 text-lg font-bold" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...
            </>
          ) : (
            "Place Cake Order"
          )}
        </Button>
      </form>
    </Form>
  )
}
