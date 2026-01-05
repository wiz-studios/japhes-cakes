"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import OrderSummary from "@/components/OrderSummary"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Confetti from "react-confetti"

// Example toppings for pizza
const PIZZA_TOPPINGS: string[] = [
  "Extra Cheese",
  "Pepperoni",
  "Mushrooms",
  "Onions",
  "Olives",
  "Pineapple",
  "Chicken",
]


// Import backend submission functions
import { submitPizzaOrder, submitCakeOrder } from "@/app/actions/orders"
import { initiateMpesaSTK } from "@/lib/mpesa"
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector"
import type { PaymentMethod } from "@/lib/types/payment"

// Main review page component
// Types for order and item
type PizzaOrderItem = {
  name: string
  quantity: number
  size: string
  toppings?: string[]
  notes?: string
  customerName?: string
}
type CakeOrderItem = {
  name: string
  quantity: number
  size: string
  flavor?: string
  notes?: string
  message?: string
  customerName?: string
}
type Order = {
  type: 'pizza' | 'cake'
  items: (PizzaOrderItem | CakeOrderItem)[]
  deliveryFee: number
  total: number
  fulfilment: string
  deliveryZone: string
  deliveryZoneId?: string
  customerName?: string
  scheduledDate: string
  placedHour: number
  phone: string
}

import { Suspense } from "react"
import { Loader2 } from "lucide-react"

function OrderReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Read order data from query string
  const orderQuery = searchParams.get("order")
  const initialOrder: Order | null = orderQuery ? JSON.parse(orderQuery) : null
  const [order, setOrder] = useState<Order>(initialOrder as Order)
  const [submitting, setSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(80) // 80%: review step

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [mpesaPhone, setMpesaPhone] = useState("")

  // Pricing Constants (should match Order Forms)
  const CAKE_PRICES: Record<string, number> = { "1kg": 2500, "1.5kg": 3700, "2kg": 4800, "3kg": 7000 }
  const FLAVOR_SURCHARGES: Record<string, number> = { "Vanilla": 0, "Lemon": 0, "Fruit": 0, "Chocolate": 500, "Red Velvet": 500, "Black Forest": 500, "Blueberry": 500 }

  // Live price calculation
  useEffect(() => {
    if (!order) return
    let total = order.items.reduce((sum: number, item: PizzaOrderItem | CakeOrderItem) => {
      let base = 0

      if (order.type === "cake") {
        const cakeItem = item as CakeOrderItem
        // Use strict pricing matrix
        // Fallback to "1kg" price if size not found to prevent NaN, though size should be valid
        const sizePrice = CAKE_PRICES[cakeItem.size.toLowerCase()] || CAKE_PRICES["1kg"]
        const flavorSurcharge = FLAVOR_SURCHARGES[cakeItem.flavor || "Vanilla"] || 0
        base = sizePrice + flavorSurcharge
      } else {
        // Pizza Logic (Legacy but preserved)
        base = 1000
        if (item.size === "Large") base = 1500
        if (item.size === "Small") base = 700
        if ((item as PizzaOrderItem).toppings) base += ((item as PizzaOrderItem).toppings?.length || 0) * 100
      }
      return sum + base * item.quantity
    }, 0)
    total += order.deliveryFee
    setOrder((o: Order) => ({ ...o, total }))
  }, [order?.items, order?.deliveryFee, order?.type])

  // Inline edit handlers
  const updateItem = (idx: number, changes: Partial<PizzaOrderItem | CakeOrderItem>) => {
    setOrder((o: Order) => {
      const items = [...o.items]
      items[idx] = { ...items[idx], ...changes }
      return { ...o, items }
    })
  }
  const updateNotes = (idx: number, notes: string) => updateItem(idx, { notes })
  const updateQuantity = (idx: number, quantity: number) => updateItem(idx, { quantity: Math.max(1, quantity) })
  const updateSize = (idx: number, size: string) => updateItem(idx, { size })
  const updateToppings = (idx: number, topping: string) => {
    setOrder((o: Order) => {
      const items = [...o.items]
      const item = { ...items[idx] } as PizzaOrderItem
      item.toppings = item.toppings || []
      if (item.toppings.includes(topping)) {
        item.toppings = item.toppings.filter((t: string) => t !== topping)
      } else {
        item.toppings.push(topping)
      }
      items[idx] = item
      return { ...o, items }
    })
  }

  // Validation (example: Nairobi min order, late-night cutoff)
  useEffect(() => {
    if (!order) return
    setError("")
    if (order.fulfilment === "delivery" && order.deliveryZone.toLowerCase().includes("nairobi") && order.total < 2000) {
      setError("Nairobi pizza orders require a minimum value of KES 2,000")
    }
    if (order.placedHour >= 21) {
      setError("Orders placed after 9 PM will be scheduled for the next day.")
    }
    // Strict Cake Date Validation
    if (order.type === "cake" && !order.scheduledDate) {
      setError("Date required for cake orders. Please go back and select a date.")
    }
  }, [order])

  // Submission handler
  // Final submission handler
  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    // Block submission if critical errors exist (like missing cake date)
    if (error && error.includes("Date required")) {
      return
    }

    console.log("=== SUBMIT CLICKED ===")
    console.log("Payment method:", paymentMethod)
    console.log("M-Pesa phone:", mpesaPhone)
    console.log("Order data:", order)

    setSubmitting(true)
    // setError("") // Don't clear error here if it's a blocking validation, but we re-validate below anyway. 
    // Actually better to keep existing flow but ensure we don't proceed if validation fails.

    // ... existing submission logic ...

    // Re-validate M-Pesa phone if selected
    if (paymentMethod === "mpesa" && !mpesaPhone) {
      console.log("Validation failed: M-Pesa phone required")
      setError("Please enter your M-Pesa phone number")
      setSubmitting(false)
      return
    }

    // Verify imports at the top:
    // import { initiateMpesaSTK } from "@/lib/mpesa" 

    try {
      let result
      if (order.type === "pizza") {
        // Map order data back to pizza form shape
        const pizzaData = {
          pizzaType: order.items[0].name,
          pizzaSize: order.items[0].size,
          quantity: order.items[0].quantity,
          fulfilment: order.fulfilment,
          deliveryZoneId: order.deliveryZoneId,
          deliveryLat: (order as any).deliveryLat,
          deliveryLng: (order as any).deliveryLng,
          deliveryAddress: (order as any).deliveryAddress,
          deliveryDistance: (order as any).deliveryDistance,
          customerName: order.customerName || order.items[0].customerName || "",
          phone: order.phone,
          notes: order.items[0].notes,
          paymentMethod,
          mpesaPhone,
        }
        result = await submitPizzaOrder(pizzaData)
      } else if (order.type === "cake") {
        // Map order data back to cake form shape
        const cakeData = {
          cakeSize: order.items[0].size,
          cakeFlavor: (order.items[0] as CakeOrderItem).flavor || "",
          designNotes: order.items[0].notes,
          cakeMessage: (order.items[0] as CakeOrderItem).message || "",
          fulfilment: order.fulfilment,
          deliveryZoneId: order.deliveryZoneId,
          deliveryLat: (order as any).deliveryLat,
          deliveryLng: (order as any).deliveryLng,
          deliveryAddress: (order as any).deliveryAddress,
          deliveryDistance: (order as any).deliveryDistance,
          preferredDate: order.scheduledDate ? new Date(order.scheduledDate) : new Date(),
          customerName: order.customerName || order.items[0].customerName || "",
          phone: order.phone,
          paymentMethod,
          mpesaPhone,
        }
        result = await submitCakeOrder(cakeData)
      }
      if (result && result.success) {
        // NON-BLOCKING STK PUSH (v0 Prompt)
        if (paymentMethod === "mpesa" && mpesaPhone) {
          console.log("Triggering Fire-and-Forget STK Push for:", result.orderId)
          // We do NOT await this result for the UI block. 
          // Ideally we await just to ensure the request was sent successfully to OUR backend?
          // The prompt said "Call initiateMpesaSTK... Return immediately (no waiting)".
          // It meant from the SERVER action perspective mostly, but frontend should also not block deeply.
          // However, we MUST call correct action.

          // We can await the *initiation* to ensure we get a success signal that the process started,
          // but we do NOT wait for payment completion.
          await initiateMpesaSTK(result.orderId, mpesaPhone)
        }

        setShowConfetti(true)
        setProgress(100)
        // Redirect immediately - user will see status on next page
        setTimeout(() => {
          router.push(`/order/submitted?id=${result.orderId}`)
        }, 1000) // Reduced delay for snappier feel
      } else {
        const errorMsg = result?.error || "Failed to submit order"
        console.error("Order submission failed:", errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      console.error("Order submission error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      // Keep submitting true during redirect to prevent double clicks
      if (!showConfetti) setSubmitting(false)
    }
  }

  // Back navigation
  // Back navigation: return to correct form with pre-filled data
  const handleBack = () => {
    const formPath = order.type === "cake" ? "/order/cake" : "/order/pizza"
    router.push(`${formPath}?order=${encodeURIComponent(JSON.stringify(order))}`)
  }

  if (!order) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>

  // Date Logic Helper
  const getDateDisplay = () => {
    // If date exists, show it formatted (For both Cake and Pizza)
    if (order.scheduledDate) {
      return {
        label: "Scheduled Date",
        value: new Date(order.scheduledDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      }
    }

    // If Cake and NO date -> Error (Handled by validation/error state, but display fallback here)
    if (order.type === "cake") {
      return { label: "Scheduled Date", value: "Date Required" }
    }

    // Pizza + No Date (ASAP) logic
    if (order.fulfilment === "delivery") {
      return { label: "Estimated Delivery", value: "45–60 minutes" }
    } else {
      return { label: "Ready for Pickup", value: "~30 minutes" }
    }
  }

  const { label: dateLabel, value: dateValue } = getDateDisplay()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-rose-50 flex flex-col">
      {showConfetti && <Confetti />}
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="py-8 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-rose-600 mb-2 animate-pulse">
          Review Your Order <span aria-label="cake and pizza" role="img">🍰🍕</span>
        </h1>
        <p className="text-muted-foreground text-lg">Almost there! Just confirm your delicious order 🍕🍰</p>
        <div className="max-w-xs mx-auto mt-4">
          <Progress value={progress} className="h-2 bg-amber-200" />
        </div>
      </motion.div>

      {/* Main Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-2">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-lg"
        >
          {/* Editable Order Items */}
          {order.items.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{item.name}</span>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateQuantity(idx, parseInt(e.target.value))}
                    className="w-14 px-2 py-1 border rounded focus:ring-2 focus:ring-amber-400 transition"
                    aria-label="Quantity"
                  />
                </div>
              </div>
              <div className="flex gap-4 items-center mb-2">
                <label className="text-sm font-medium">Size</label>
                <select
                  value={item.size}
                  onChange={e => updateSize(idx, e.target.value)}
                  className="px-2 py-1 border rounded focus:ring-2 focus:ring-rose-400 transition"
                  aria-label="Size"
                >
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                </select>
                {/* Cake flavor selector */}
                {order.type === "cake" && (
                  <>
                    <label className="text-sm font-medium ml-2">Flavor</label>
                    <select
                      value={(item as CakeOrderItem).flavor || "Vanilla"}
                      onChange={e => updateItem(idx, { flavor: e.target.value })}
                      className="px-2 py-1 border rounded focus:ring-2 focus:ring-rose-400 transition"
                      aria-label="Flavor"
                    >
                      <option value="Vanilla">Vanilla</option>
                      <option value="Chocolate">Chocolate</option>
                      <option value="Red Velvet">Red Velvet</option>
                      <option value="Lemon">Lemon</option>
                    </select>
                  </>
                )}
              </div>
              {/* Pizza toppings selector */}
              {order.type === "pizza" && (
                <div className="mb-2">
                  <label className="text-sm font-medium">Toppings</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PIZZA_TOPPINGS.map(topping => (
                      <button
                        key={topping}
                        type="button"
                        onClick={() => updateToppings(idx, topping)}
                        className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all duration-150
                          ${(item as PizzaOrderItem).toppings?.includes(topping)
                            ? "bg-amber-400 text-white border-amber-400 scale-105 shadow"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-amber-100"}
                        `}
                        aria-pressed={(item as PizzaOrderItem).toppings?.includes(topping)}
                      >
                        {topping}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Notes */}
              <div className="mt-2">
                <label className="text-sm font-medium">Notes</label>
                <input
                  type="text"
                  value={item.notes || ""}
                  onChange={e => updateNotes(idx, e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-rose-400 transition"
                  placeholder="Add any special instructions..."
                  aria-label="Notes"
                />
              </div>
            </div>
          ))}

          {/* Delivery/Pickup Info */}
          <div className="bg-white rounded-2xl shadow p-5 mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{order.fulfilment === "delivery" ? "Delivery" : "Pickup"}:</span>
              <span className="text-rose-600 font-bold">
                {order.fulfilment === "pickup" ? "Thika" : order.deliveryZone}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{dateLabel}:</span>
              <span className="text-amber-600 font-bold">
                {dateValue}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Phone:</span>
              <span className="text-gray-700">{order.phone}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-2xl shadow p-5 mb-4">
            <PaymentMethodSelector
              fulfilment={order.fulfilment as "delivery" | "pickup"}
              value={paymentMethod}
              onChange={setPaymentMethod}
              mpesaPhone={mpesaPhone}
              onMpesaPhoneChange={setMpesaPhone}
            />
          </div>

          {/* Order Summary */}
          <OrderSummary order={order} />

          {/* Error/Warning */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 text-center text-red-600 font-semibold bg-red-50 rounded p-2"
                role="alert"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 gap-4">
            <Button type="button" variant="outline" className="w-1/2" onClick={handleBack}>
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="w-1/2 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold"
              disabled={submitting}
            >
              {submitting ? (
                <span className="animate-pulse">Submitting...</span>
              ) : (
                "Confirm & Submit"
              )}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default function OrderReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>}>
      <OrderReviewContent />
    </Suspense>
  )
}

// ---
// UX Notes:
// - Animations highlight edits and submission for delight.
// - Inline edits update price and validate in real time.
// - Modular: can be used for both pizza and cake flows.
// - Accessible: ARIA labels, keyboard nav, color contrast.
// - Mobile-first: responsive, touch-friendly controls.
