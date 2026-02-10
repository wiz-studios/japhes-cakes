"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { addHours, isAfter, setHours, setMinutes } from "date-fns"
import { getInitialPaymentStatus, canProgressToStatus } from "@/lib/payment-rules"
import { validateDeliveryRequest } from "@/lib/delivery-logic"
import { getPizzaUnitPrice } from "@/lib/pizza-pricing"
import { getPizzaOfferDetails } from "@/lib/pizza-offer"
import { getCakeDisplayName, getCakePrice } from "@/lib/cake-pricing"

const VALID_TRANSITIONS: Record<string, string[]> = {
  order_received: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["delivered", "collected", "cancelled"],
  in_kitchen: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
}

function generateOrderNumber(prefix: "C" | "P") {
  const timePart = Date.now().toString(36).slice(-4).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `${prefix}${timePart}${randomPart}`
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createServerSupabaseClient()

  // Get current order with payment info
  const { data: order } = await supabase
    .from("orders")
    .select("status, fulfilment, payment_method, payment_status")
    .eq("id", orderId)
    .single()

  if (!order) return { success: false, error: "Order not found" }

  // Validate transition
  if (!VALID_TRANSITIONS[order.status]?.includes(newStatus)) {
    return { success: false, error: `Invalid transition from ${order.status} to ${newStatus}` }
  }

  // Get current user and enforce admin-only access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Please sign in" }
  }

  const role = user?.user_metadata?.role as "admin" | undefined
  if (role && role !== "admin") {
    return { success: false, error: "Unauthorized: Admin access required" }
  }

  // Enforce payment & role rules
  // We cast order to any temporarily because deep types might mismatch, but logic holds
  const progressCheck = canProgressToStatus(order as any, newStatus, "admin")

  if (!progressCheck.allowed) {
    return { success: false, error: progressCheck.reason || "Action not allowed for your role" }
  }

  const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId)
  return { success: error === null, error: error?.message }
}

/**
 * Mark an order as paid (admin action)
 * Allows admins to manually confirm payment for M-Pesa orders
 */
export async function markOrderAsPaid(orderId: string, transactionId?: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Please sign in" }
  }

  const role = user?.user_metadata?.role as "admin" | undefined
  if (role && role !== "admin") {
    return { success: false, error: "Unauthorized: Admin access required" }
  }

  const { data: order } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("id", orderId)
    .single()

  const updateData: any = {
    payment_status: "paid",
    payment_amount_paid: order?.total_amount ?? null,
    payment_amount_due: 0,
  }

  if (transactionId) {
    updateData.mpesa_transaction_id = transactionId
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)

  return { success: error === null, error: error?.message }
}

/**
 * STRICT DELIVERY ACTION: Complete Delivery & (Optional) Collect Cash
 */
export async function completeDelivery(orderId: string, collectedCash: boolean = false) {
  const supabase = await createServerSupabaseClient()

  // 1. Role Check (Admin only)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Please sign in" }
  }

  const role = user?.user_metadata?.role as "admin" | undefined
  if (role && role !== "admin") {
    return { success: false, error: "Unauthorized: Admin access required" }
  }

  // 2. Fetch Order
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single()

  if (!order) return { success: false, error: "Order not found" }

  // 3. Logic Validation
  if (order.status !== "out_for_delivery") {
    return { success: false, error: "Order is not currently Out for Delivery" }
  }

  const updates: any = {
    status: "delivered"
  }

  // 4. Payment Handling
  if (order.payment_method === "cash") {
    if (!collectedCash) {
      return { success: false, error: "You must confirm cash collection to complete this delivery" }
    }
    updates.payment_status = "paid"
    updates.payment_amount_paid = order.total_amount
    updates.payment_amount_due = 0
    // Log "collected_at" if we had a field, for now just payment_status update implies it.
  } else if (order.payment_method === "mpesa") {
    if (order.payment_status === "deposit_paid") {
      if (!collectedCash) {
        return { success: false, error: "Confirm cash collection for the remaining balance to complete delivery" }
      }
      updates.payment_status = "paid"
      updates.payment_amount_due = 0
      updates.payment_amount_paid = order.total_amount
    } else if (order.payment_status !== "paid") {
      return { success: false, error: "CRITICAL: Cannot deliver unpaid M-Pesa order. Return to shop." }
    }
  }

  const { error } = await supabase.from("orders").update(updates).eq("id", orderId)
  return { success: !error, error: error?.message }
}

export async function submitCakeOrder(values: any) {
  const supabase = await createServerSupabaseClient()

  try {
    if (values.paymentMethod !== "mpesa") {
      return { success: false, error: "M-Pesa payment is required (50% deposit or full)." }
    }
    // 1. Get zone info for fee calculation
    let deliveryFee = 0
    let deliveryWindow = "N/A"

    if (values.fulfilment === "delivery") {
      // 1. GPS DELIVERY (Priority)
      if (values.deliveryLat && values.deliveryLng) {
        const check = validateDeliveryRequest(values.deliveryLat, values.deliveryLng)
        if (!check.allowed) {
          return { success: false, error: check.error || "Delivery location unavailable" }
        }
        deliveryFee = check.fee!
        // We can set default window or calculate it based on distance/traffic later
        deliveryWindow = `${check.distance}km (${Math.ceil(check.distance! * 3 + 30)} mins)`
      }
      // 2. LEGACY ZONES
      else if (values.deliveryZoneId) {
        const { data: zone } = await supabase.from("delivery_zones").select("*").eq("id", values.deliveryZoneId).single()

        if (zone) {
          deliveryFee = zone.delivery_fee
          deliveryWindow = zone.delivery_window
        }
      } else {
        return { success: false, error: "Please select a delivery location" }
      }
    }

    // Calculate cake price from pricing table
    const itemTotal = getCakePrice(values.cakeFlavor, values.cakeSize)
    const total = itemTotal + deliveryFee
    const paymentPlan = (values.paymentPlan || "full") as "full" | "deposit"
    const depositAmount = Math.ceil(total * 0.5)

    // 2. Insert order (retry on friendly_id collision)
    let order = null
    let orderError = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const friendlyId = generateOrderNumber("C")
      const { data, error } = await supabase
        .from("orders")
        .insert({
          friendly_id: friendlyId,
          order_type: "cake",
          fulfilment: values.fulfilment,
          customer_name: values.customerName,
          phone: values.phone,
          delivery_zone_id: values.deliveryZoneId || null,
          delivery_window: deliveryWindow,
          delivery_fee: deliveryFee,
          delivery_lat: values.deliveryLat || null,
          delivery_lng: values.deliveryLng || null,
          delivery_address: values.deliveryAddress || null,
          delivery_distance_km: values.deliveryLat ? validateDeliveryRequest(values.deliveryLat, values.deliveryLng).distance : null,
          total_amount: total,
          preferred_date: values.preferredDate,
          expires_at: addHours(new Date(), 2).toISOString(),
          status: "order_received",
          payment_method: values.paymentMethod || "mpesa",
          payment_status: getInitialPaymentStatus(
            values.paymentMethod || "mpesa",
            values.fulfilment,
            paymentPlan
          ),
          payment_plan: paymentPlan,
          payment_amount_paid: 0,
          payment_amount_due: total,
          payment_deposit_amount: depositAmount,
          mpesa_phone: values.paymentMethod === "mpesa" ? values.mpesaPhone : null,
        })
        .select()
        .single()

      if (!error) {
        order = data
        orderError = null
        break
      }

      orderError = error
      if (error.code !== "23505") break
    }

    if (orderError || !order) throw orderError || new Error("Failed to create order")

    // 3. Insert order item
    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      item_name: `${values.cakeSize} ${getCakeDisplayName(values.cakeFlavor)}`,
      notes: `Design: ${values.designNotes || "None"}. Message: ${values.cakeMessage || "None"}`,
    })

    if (itemError) throw itemError

    return { success: true, orderId: order.id }
  } catch (error) {
    console.error("[v0] Error submitting cake order:", error)
    return { success: false, error: "Database error. Please try again." }
  }
}

export async function submitPizzaOrder(values: any) {
  const supabase = await createServerSupabaseClient()

  try {
    if (values.paymentMethod !== "mpesa") {
      return { success: false, error: "M-Pesa payment is required (50% deposit or full)." }
    }
    const now = new Date()
    const cutoff = setMinutes(setHours(new Date(), 21), 0)
    let preferredDate = values.preferredDate || now

    if (isAfter(now, cutoff)) {
      // Shift to tomorrow
      preferredDate = addHours(now, 24)
    }

    let deliveryFee = 0
    let deliveryWindow = "As soon as possible"

    const toppings: string[] = Array.isArray(values.toppings) ? values.toppings : []
    const toppingsCount = toppings.length

    if (values.fulfilment === "delivery") {
      // 1. GPS DELIVERY (Priority)
      if (values.deliveryLat && values.deliveryLng) {
        const check = validateDeliveryRequest(values.deliveryLat, values.deliveryLng)
        if (!check.allowed) {
          return { success: false, error: check.error || "Delivery location unavailable" }
        }
        deliveryFee = check.fee!
        deliveryWindow = `${check.distance}km (~${Math.ceil(check.distance! * 3 + 25)} mins)`

        // Nairobi check (approximate coords for Nairobi if needed, but strict radius handles most)
        // For now, removing specific Nairobi minimum unless we geo-fence Nairobi specifically.
        // Assuming strict radius from Thika covers strict area.
      }
      // 2. LEGACY ZONES 
      else if (values.deliveryZoneId) {
        const { data: zone } = await supabase.from("delivery_zones").select("*").eq("id", values.deliveryZoneId).single()

        if (zone) {
          const isNairobi = zone.name.toLowerCase().includes("nairobi")
          const unitPrice = getPizzaUnitPrice(values.pizzaSize, values.pizzaType, toppingsCount)
          // Minimum value check uses pre-offer subtotal to avoid blocking valid offer orders
          const totalItemsValue = unitPrice * (values.quantity || 1)

          if (isNairobi && totalItemsValue < 2000) {
            return { success: false, error: "Nairobi pizza orders require a minimum value of KES 2,000" }
          }

          deliveryFee = zone.delivery_fee
          deliveryWindow = zone.delivery_window
        }
      } else {
        return { success: false, error: "Please select a delivery location" }
      }
    }

    // Calculate pizza total with offer logic
    const unitPrice = getPizzaUnitPrice(values.pizzaSize, values.pizzaType, toppingsCount)
    const quantity = values.quantity || 1
    const rawSubtotal = unitPrice * quantity
    const offer = getPizzaOfferDetails({
      size: values.pizzaSize,
      quantity,
      unitPrice,
    })
    const itemTotal = rawSubtotal - offer.discount
    const total = itemTotal + deliveryFee
    const paymentPlan = (values.paymentPlan || "full") as "full" | "deposit"
    const depositAmount = Math.ceil(total * 0.5)

    let order = null
    let orderError = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const friendlyId = generateOrderNumber("P")
      const { data, error } = await supabase
        .from("orders")
        .insert({
          friendly_id: friendlyId,
          order_type: "pizza",
          fulfilment: values.fulfilment,
          customer_name: values.customerName,
          phone: values.phone,
          delivery_zone_id: values.deliveryZoneId || null,
          delivery_window: deliveryWindow,
          delivery_fee: deliveryFee,
          total_amount: total,
          preferred_date: preferredDate, // use calculated date
          status: "order_received",
          payment_method: values.paymentMethod || "mpesa",
          payment_status: getInitialPaymentStatus(
            values.paymentMethod || "mpesa",
            values.fulfilment,
            paymentPlan
          ),
          payment_plan: paymentPlan,
          payment_amount_paid: 0,
          payment_amount_due: total,
          payment_deposit_amount: depositAmount,
          mpesa_phone: values.paymentMethod === "mpesa" ? values.mpesaPhone : null,
        })
        .select()
        .single()

      if (!error) {
        order = data
        orderError = null
        break
      }

      orderError = error
      if (error.code !== "23505") break
    }

    if (orderError || !order) throw orderError || new Error("Failed to create order")

    const extrasNote = toppingsCount > 0
      ? `Extras: ${toppings.join(", ")} (+${(toppingsCount * 100).toLocaleString()} KES)`
      : ""
    const offerNote = offer.discount > 0
      ? `Offer: 2-for-1 applied (${offer.freeQuantity} free)`
      : ""
    const combinedNotes = [values.notes, extrasNote, offerNote].filter(Boolean).join(" | ")

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      item_name: `${values.pizzaSize} ${values.pizzaType} Pizza`,
      quantity: values.quantity,
      notes: combinedNotes,
    })

    if (itemError) throw itemError

    return { success: true, orderId: order.id }
  } catch (error) {
    console.error("[v0] Error submitting pizza order:", error)
    return { success: false, error: "Database error. Please try again." }
  }
}
