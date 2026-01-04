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
import { submitPizzaOrder } from "@/app/actions/orders"

const pizzaSchema = z
  .object({
    pizzaType: z.string().min(1, "Please select a pizza"),
    pizzaSize: z.string().min(1, "Please select a size"),
    quantity: z.coerce.number().min(1).max(20),
    fulfilment: z.enum(["pickup", "delivery"]),
    deliveryZoneId: z.string().optional(),
    customerName: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    notes: z.string().optional(),
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

export function PizzaOrderForm({ zones }: { zones: DeliveryZone[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [minError, setMinError] = useState<string | null>(null)
  const [lateNightWarning, setLateNightWarning] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()


  // Support pre-filling form from router state (for back navigation)
  const initialOrder = searchParams.get("order") ? JSON.parse(decodeURIComponent(searchParams.get("order")!)) : null

  const form = useForm<z.infer<typeof pizzaSchema>>({
    resolver: zodResolver(pizzaSchema),
    defaultValues: initialOrder || {
      fulfilment: "pickup",
      pizzaType: "",
      pizzaSize: "Medium",
      quantity: 1,
      customerName: "",
      phone: "",
    },
  })

  useEffect(() => {
    const now = new Date()
    const cutoff = new Date()
    cutoff.setHours(21, 0, 0, 0)
    setLateNightWarning(now > cutoff)
  }, [])

  async function onSubmit(values: z.infer<typeof pizzaSchema>) {
    setIsSubmitting(true)
    setMinError(null)
    try {
      // Calculate total value for Nairobi delivery
      let totalValue = 0
      if (values.fulfilment === "delivery" && values.deliveryZoneId) {
        const sizePrices: Record<string, number> = { Small: 700, Medium: 1000, Large: 1500 }
        totalValue = sizePrices[values.pizzaSize] * values.quantity
        const selectedZone = zones.find((z) => z.id === values.deliveryZoneId)
        if (selectedZone && selectedZone.name.toLowerCase().includes("nairobi") && totalValue < 2000) {
          setMinError("Nairobi pizza orders require a minimum value of KES 2,000")
          setIsSubmitting(false)
          return
        }
      }
      // Instead of submitting, redirect to review page with order data
      const orderData = {
        type: "pizza",
        items: [
          {
            name: values.pizzaType,
            quantity: values.quantity,
            size: values.pizzaSize,
            notes: values.notes,
            // toppings: [] // Add toppings if implemented
          },
        ],
        deliveryFee: zones.find((z) => z.id === values.deliveryZoneId)?.delivery_fee || 0,
        fulfilment: values.fulfilment,
        deliveryZone: zones.find((z) => z.id === values.deliveryZoneId)?.name || "",
        scheduledDate: new Date().toISOString().slice(0, 10),
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

  const selectedZoneId = form.watch("deliveryZoneId")
  const selectedZone = zones.find((z) => z.id === selectedZoneId)
  const isScheduledOnly = selectedZone?.scheduled_only

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="pizzaType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pizza Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your pizza" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="margherita">Margherita</SelectItem>
                    <SelectItem value="pepperoni">Pepperoni</SelectItem>
                    <SelectItem value="bbq_chicken">BBQ Chicken</SelectItem>
                    <SelectItem value="veggie_supreme">Veggie Supreme</SelectItem>
                    <SelectItem value="hawaiian">Hawaiian</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pizzaSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Small">Small (8&quot;)</SelectItem>
                      <SelectItem value="Medium">Medium (12&quot;)</SelectItem>
                      <SelectItem value="Large">Large (14&quot;)</SelectItem>
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Instructions</FormLabel>
              <FormControl>
                <Textarea placeholder="No onions, extra cheese, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-bold">Fulfilment</h3>

          <FormField
            control={form.control}
            name="fulfilment"
            render={({ field }) => (
              <FormItem className="space-y-3">
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
                        <SelectValue placeholder="Select zone" />
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
                  {isScheduledOnly && (
                    <p className="text-xs text-amber-600 font-medium">
                      Note: Delivery to this zone is scheduled only (2-4 hours).
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-bold">Contact Details</h3>
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
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
                  <Input placeholder="07XX XXX XXX" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full py-6 text-lg font-bold" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Order Now"}
        </Button>
        {minError && (
          <div className="text-red-600 text-sm font-medium text-center pt-2">{minError}</div>
        )}
        {lateNightWarning && (
          <div className="text-amber-600 text-sm font-medium text-center pt-2">
            Orders placed after 9:00 PM will be scheduled for the next day.
          </div>
        )}
      </form>
    </Form>
  )
}
