"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"
import { addHours } from "date-fns"
import { getInitialPaymentStatus, canProgressToStatus } from "@/lib/payment-rules"
import { validateDeliveryRequest } from "@/lib/delivery-logic"
import { KENYA_PHONE_REGEX, normalizeKenyaPhone } from "@/lib/phone"
import { getPizzaUnitPrice, PIZZA_BASE_PRICES, PIZZA_TYPE_PRICES } from "@/lib/pizza-pricing"
import { getPizzaOfferDetails } from "@/lib/pizza-offer"
import { getCakeDisplayName, getCakePrice, CAKE_FLAVORS, CAKE_SIZES } from "@/lib/cake-pricing"
import { applyBusyEtaWindow, DEFAULT_STORE_SETTINGS, normalizeStoreSettings } from "@/lib/store-settings"
import { checkRateLimit } from "@/lib/rate-limit"
import { runIdempotent } from "@/lib/idempotency"
import { getDeliveryZoneByIdCached } from "@/lib/delivery-zones-cache"
import { toNairobiDate } from "@/lib/time"
import type { User } from "@supabase/supabase-js"

const VALID_TRANSITIONS: Record<string, string[]> = {
  order_received: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["delivered", "collected", "cancelled"],
  in_kitchen: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [], // Terminal state
  cancelled: [], // Terminal state
}

const ALLOWED_PIZZA_TOPPINGS = new Set(["Extra Cheese", "Extra Toppings"])
const MAX_TEXT_LENGTHS = {
  customerName: 80,
  notes: 400,
  cakeMessage: 120,
  deliveryAddress: 240,
}
const CAKE_DESIGN_MAX_BYTES = 4 * 1024 * 1024
const CAKE_DESIGN_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function generateOrderNumber(prefix: "C" | "P") {
  const timePart = Date.now().toString(36).slice(-4).toUpperCase()
  const randomPart = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `${prefix}${timePart}${randomPart}`
}

function isAdminUser(user: User | null): boolean {
  if (!user) return false
  const role = user.user_metadata?.role as string | undefined
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (role === "admin") return true
  if (adminEmail && user.email?.toLowerCase() === adminEmail) return true
  return false
}

async function checkOrderRateLimit(supabase: any, phone: string) {
  const windowMinutes = Number(process.env.ORDER_RATE_LIMIT_WINDOW_MINUTES || 10)
  const maxOrders = Number(process.env.ORDER_RATE_LIMIT_MAX_ORDERS || 4)
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since)

  if (error) return null
  if ((count || 0) >= maxOrders) {
    return `Too many attempts. Please wait ${windowMinutes} minutes and try again.`
  }

  return null
}

function checkOrderBurstRateLimit(phone: string) {
  const maxAttempts = Number(process.env.ORDER_SUBMIT_RATE_LIMIT_PER_MINUTE || 3)
  const windowMs = 60 * 1000
  return checkRateLimit(`order-submit:${phone}`, maxAttempts, windowMs)
}

function createOrderCorrelationId() {
  return `order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, maxLength)
}

async function getStoreSettings(supabase: any) {
  const { data } = await supabase
    .from("store_settings")
    .select("busy_mode_enabled, busy_mode_action, busy_mode_extra_minutes, busy_mode_message")
    .eq("id", true)
    .maybeSingle()

  return normalizeStoreSettings(data || DEFAULT_STORE_SETTINGS)
}

function validateBusyModeBeforeOrder(settings: ReturnType<typeof normalizeStoreSettings>) {
  if (!settings.busyModeEnabled) return null
  if (settings.busyModeAction !== "disable_orders") return null
  return settings.busyModeMessage || "Orders are temporarily paused due to high kitchen load. Please try again later."
}

function sanitizeUploadFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

function getAdminSupabaseForUpload() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { client: null, error: "Missing Supabase admin credentials." }
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }),
    error: null,
  }
}

function getServiceSupabase() {
  const { client, error } = getAdminSupabaseForUpload()
  if (!client) {
    throw new Error(error || "Missing Supabase admin credentials.")
  }
  return client
}

export async function uploadCakeDesignImage(formData: FormData) {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Image file is required." }
  }

  if (!CAKE_DESIGN_ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: "Only JPG, PNG, and WEBP images are allowed." }
  }

  if (file.size > CAKE_DESIGN_MAX_BYTES) {
    return { success: false, error: "Image must be 4MB or smaller." }
  }

  const { client: supabase, error: clientError } = getAdminSupabaseForUpload()
  if (!supabase) {
    return { success: false, error: clientError || "Failed to initialize upload service." }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeName = sanitizeUploadFileName(file.name || "cake-design")
  const path = `orders/${new Date().getFullYear()}/${Date.now()}-${safeName}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from("cake-designs")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage.from("cake-designs").getPublicUrl(path)
  return { success: true, url: urlData.publicUrl }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const sessionClient = await createServerSupabaseClient()
  const supabase = getServiceSupabase()

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
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Please sign in" }
  }

  if (!isAdminUser(user)) {
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
  const sessionClient = await createServerSupabaseClient()
  const supabase = getServiceSupabase()

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Please sign in" }
  }

  if (!isAdminUser(user)) {
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

export async function updateOrderPaymentStatus(input: {
  orderId: string
  paymentStatus: "pending" | "deposit_paid" | "paid" | "expired" | "failed"
  totalAmount: number
  depositAmount?: number | null
}) {
  const sessionClient = await createServerSupabaseClient()
  const supabase = getServiceSupabase()

  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Please sign in" }
  }

  if (!isAdminUser(user)) {
    return { success: false, error: "Unauthorized: Admin access required" }
  }

  const paymentStatus = input.paymentStatus
  const updateData: Record<string, unknown> = { payment_status: paymentStatus }

  if (paymentStatus === "paid") {
    updateData.payment_amount_paid = input.totalAmount
    updateData.payment_amount_due = 0
  } else if (paymentStatus === "deposit_paid") {
    const deposit = input.depositAmount ?? Math.ceil(input.totalAmount * 0.5)
    updateData.payment_amount_paid = deposit
    updateData.payment_amount_due = Math.max(input.totalAmount - deposit, 0)
  } else if (paymentStatus === "pending" || paymentStatus === "failed" || paymentStatus === "expired") {
    updateData.payment_amount_paid = 0
    updateData.payment_amount_due = input.totalAmount
  }

  const { error } = await supabase.from("orders").update(updateData).eq("id", input.orderId)
  return { success: error === null, error: error?.message }
}

/**
 * STRICT DELIVERY ACTION: Complete Delivery & (Optional) Collect Cash
 */
export async function completeDelivery(orderId: string, collectedCash: boolean = false) {
  const sessionClient = await createServerSupabaseClient()
  const supabase = getServiceSupabase()

  // 1. Role Check (Admin only)
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized: Please sign in" }
  }

  if (!isAdminUser(user)) {
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
  const supabase = getServiceSupabase()
  const correlationId = createOrderCorrelationId()
  const idempotencyKey = typeof values?.idempotencyKey === "string" ? values.idempotencyKey : undefined

  try {
    const guarded = await runIdempotent<{ success: boolean; error?: string; orderId?: string }>({
      scope: "order-submit:cake",
      idempotencyKey,
      ttlSeconds: 15 * 60,
      run: async () => {
        if (!values || typeof values !== "object") {
          return { success: false, error: "Invalid request payload." }
        }

        const normalizedPhone = normalizeKenyaPhone(values.phone || "")
        if (!KENYA_PHONE_REGEX.test(normalizedPhone)) {
          return { success: false, error: "Use 07XXXXXXXX or 01XXXXXXXX for phone number." }
        }
        const burstLimit = checkOrderBurstRateLimit(normalizedPhone)
        if (!burstLimit.allowed) {
          return { success: false, error: "Too many rapid submissions. Please wait and try again." }
        }
        const rateLimitError = await checkOrderRateLimit(supabase, normalizedPhone)
        if (rateLimitError) return { success: false, error: rateLimitError }
        const storeSettings = await getStoreSettings(supabase)
        const busyModeBlock = validateBusyModeBeforeOrder(storeSettings)
        if (busyModeBlock) {
          return { success: false, error: busyModeBlock }
        }

        if (!CAKE_FLAVORS.includes(values.cakeFlavor)) {
          return { success: false, error: "Invalid cake flavor selected." }
        }
        if (!CAKE_SIZES.includes(values.cakeSize)) {
          return { success: false, error: "Invalid cake size selected." }
        }
        if (values.fulfilment !== "pickup" && values.fulfilment !== "delivery") {
          return { success: false, error: "Invalid fulfilment method." }
        }
        const customerName = sanitizeText(values.customerName, MAX_TEXT_LENGTHS.customerName)
        if (!customerName || customerName.length < 2) {
          return { success: false, error: "Please enter a valid customer name." }
        }
        const designNotes = sanitizeText(values.designNotes, MAX_TEXT_LENGTHS.notes)
        const cakeMessage = sanitizeText(values.cakeMessage, MAX_TEXT_LENGTHS.cakeMessage)
        const deliveryAddress = sanitizeText(values.deliveryAddress, MAX_TEXT_LENGTHS.deliveryAddress)
        const designImageUrl = typeof values.designImageUrl === "string" ? values.designImageUrl.trim().slice(0, 1000) : ""
        const normalizedMpesaPhone = normalizeKenyaPhone(values.mpesaPhone || normalizedPhone)
        if (values.paymentMethod === "mpesa" && !KENYA_PHONE_REGEX.test(normalizedMpesaPhone)) {
          return { success: false, error: "Use 07XXXXXXXX or 01XXXXXXXX for M-Pesa number." }
        }

        if (values.paymentMethod !== "mpesa") {
          return { success: false, error: "M-Pesa payment is required (50% deposit or full)." }
        }
        let deliveryFee = 0
        let deliveryWindow = "As soon as possible"

        let safeDeliveryLat: number | null = null
        let safeDeliveryLng: number | null = null

        if (values.fulfilment === "delivery") {
          if (values.deliveryLat && values.deliveryLng) {
            const lat = Number(values.deliveryLat)
            const lng = Number(values.deliveryLng)
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return { success: false, error: "Invalid delivery coordinates." }
            }
            safeDeliveryLat = lat
            safeDeliveryLng = lng
            const check = validateDeliveryRequest(lat, lng)
            if (!check.allowed) {
              return { success: false, error: check.error || "Delivery location unavailable" }
            }
            deliveryFee = check.fee!
            deliveryWindow = `${check.distance}km (${Math.ceil(check.distance! * 3 + 30)} mins)`
          } else if (values.deliveryZoneId) {
            const zone = await getDeliveryZoneByIdCached(supabase, values.deliveryZoneId)
            if (zone) {
              deliveryFee = zone.delivery_fee
              deliveryWindow = zone.delivery_window
            }
          } else {
            return { success: false, error: "Please select a delivery location" }
          }
          if (!deliveryAddress) {
            return { success: false, error: "Please provide a delivery address or landmark." }
          }
        }

        if (storeSettings.busyModeEnabled && storeSettings.busyModeAction === "increase_eta") {
          deliveryWindow = applyBusyEtaWindow(deliveryWindow, storeSettings.busyModeExtraMinutes)
        }

        const itemTotal = getCakePrice(values.cakeFlavor, values.cakeSize)
        const total = itemTotal + deliveryFee
        const paymentPlanRaw = values.paymentPlan || "full"
        if (paymentPlanRaw !== "full" && paymentPlanRaw !== "deposit") {
          return { success: false, error: "Invalid payment plan." }
        }
        const paymentPlan = paymentPlanRaw as "full" | "deposit"
        const depositAmount = Math.ceil(total * 0.5)

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
              customer_name: customerName,
              phone: normalizedPhone,
              delivery_zone_id: values.deliveryZoneId || null,
              delivery_window: deliveryWindow,
              delivery_fee: deliveryFee,
              delivery_lat: safeDeliveryLat,
              delivery_lng: safeDeliveryLng,
              delivery_address: deliveryAddress || null,
              delivery_distance_km:
                safeDeliveryLat !== null && safeDeliveryLng !== null
                  ? validateDeliveryRequest(safeDeliveryLat, safeDeliveryLng).distance
                  : null,
              total_amount: total,
              preferred_date: values.preferredDate,
              expires_at: addHours(new Date(), 2).toISOString(),
              status: "order_received",
              payment_method: values.paymentMethod || "mpesa",
              payment_status: getInitialPaymentStatus(values.paymentMethod || "mpesa", values.fulfilment, paymentPlan),
              payment_plan: paymentPlan,
              payment_amount_paid: 0,
              payment_amount_due: total,
              payment_deposit_amount: depositAmount,
              mpesa_phone: values.paymentMethod === "mpesa" ? normalizedMpesaPhone : null,
            })
            .select("id")
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

        const { error: itemError } = await supabase.from("order_items").insert({
          order_id: order.id,
          item_name: `${values.cakeSize} ${getCakeDisplayName(values.cakeFlavor)}`,
          notes: `Design: ${designNotes || "None"}. Message: ${cakeMessage || "None"}`,
          design_image_url: designImageUrl || null,
        })

        if (itemError) throw itemError

        console.log(`[ORDER-CREATE][${correlationId}] Cake order created`, {
          orderId: order.id,
          phone: normalizedPhone,
          total,
          paymentPlan,
        })

        return { success: true, orderId: order.id }
      },
    })

    if (guarded.state === "in_progress") {
      return { success: false, error: "Duplicate request in progress. Please wait a few seconds." }
    }

    return guarded.result
  } catch (error) {
    console.error(`[ORDER-CREATE][${correlationId}] Error submitting cake order:`, error)
    return { success: false, error: "Database error. Please try again." }
  }
}

export async function submitPizzaOrder(values: any) {
  const supabase = getServiceSupabase()
  const correlationId = createOrderCorrelationId()
  const idempotencyKey = typeof values?.idempotencyKey === "string" ? values.idempotencyKey : undefined

  try {
    const guarded = await runIdempotent<{ success: boolean; error?: string; orderId?: string }>({
      scope: "order-submit:pizza",
      idempotencyKey,
      ttlSeconds: 15 * 60,
      run: async () => {
        if (!values || typeof values !== "object") {
          return { success: false, error: "Invalid request payload." }
        }

        const normalizedPhone = normalizeKenyaPhone(values.phone || "")
        if (!KENYA_PHONE_REGEX.test(normalizedPhone)) {
          return { success: false, error: "Use 07XXXXXXXX or 01XXXXXXXX for phone number." }
        }
        const burstLimit = checkOrderBurstRateLimit(normalizedPhone)
        if (!burstLimit.allowed) {
          return { success: false, error: "Too many rapid submissions. Please wait and try again." }
        }
        const rateLimitError = await checkOrderRateLimit(supabase, normalizedPhone)
        if (rateLimitError) return { success: false, error: rateLimitError }
        const storeSettings = await getStoreSettings(supabase)
        const busyModeBlock = validateBusyModeBeforeOrder(storeSettings)
        if (busyModeBlock) {
          return { success: false, error: busyModeBlock }
        }

        if (!Object.keys(PIZZA_TYPE_PRICES).includes(values.pizzaType)) {
          return { success: false, error: "Invalid pizza type selected." }
        }
        if (!Object.keys(PIZZA_BASE_PRICES).includes(values.pizzaSize)) {
          return { success: false, error: "Invalid pizza size selected." }
        }
        if (values.fulfilment !== "pickup" && values.fulfilment !== "delivery") {
          return { success: false, error: "Invalid fulfilment method." }
        }
        const safeQuantity = Number(values.quantity)
        if (!Number.isFinite(safeQuantity) || safeQuantity < 1 || safeQuantity > 20) {
          return { success: false, error: "Invalid pizza quantity." }
        }
        const customerName = sanitizeText(values.customerName, MAX_TEXT_LENGTHS.customerName)
        if (!customerName || customerName.length < 2) {
          return { success: false, error: "Please enter a valid customer name." }
        }
        const notes = sanitizeText(values.notes, MAX_TEXT_LENGTHS.notes)
        const deliveryAddress = sanitizeText(values.deliveryAddress, MAX_TEXT_LENGTHS.deliveryAddress)

        const normalizedMpesaPhone = normalizeKenyaPhone(values.mpesaPhone || normalizedPhone)
        if (values.paymentMethod === "mpesa" && !KENYA_PHONE_REGEX.test(normalizedMpesaPhone)) {
          return { success: false, error: "Use 07XXXXXXXX or 01XXXXXXXX for M-Pesa number." }
        }

        if (values.paymentMethod !== "mpesa") {
          return { success: false, error: "M-Pesa payment is required (50% deposit or full)." }
        }
        const now = new Date()
        const nairobiNow = toNairobiDate(now)
        let preferredDate = values.preferredDate || now

        const isAfterCutoff =
          nairobiNow.getHours() > 21 ||
          (nairobiNow.getHours() === 21 &&
            (nairobiNow.getMinutes() > 0 || nairobiNow.getSeconds() > 0))

        if (isAfterCutoff) {
          preferredDate = addHours(now, 24)
        }

        let deliveryFee = 0
        let deliveryWindow = "As soon as possible"

        const toppings: string[] = Array.isArray(values.toppings) ? values.toppings : []
        if (toppings.length > 2 || toppings.some((entry) => !ALLOWED_PIZZA_TOPPINGS.has(entry))) {
          return { success: false, error: "Invalid pizza extras selected." }
        }
        const toppingsCount = toppings.length
        let safeDeliveryLat: number | null = null
        let safeDeliveryLng: number | null = null

        if (values.fulfilment === "delivery") {
          if (values.deliveryLat && values.deliveryLng) {
            const lat = Number(values.deliveryLat)
            const lng = Number(values.deliveryLng)
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return { success: false, error: "Invalid delivery coordinates." }
            }
            safeDeliveryLat = lat
            safeDeliveryLng = lng
            const check = validateDeliveryRequest(lat, lng)
            if (!check.allowed) {
              return { success: false, error: check.error || "Delivery location unavailable" }
            }
            deliveryFee = check.fee!
            deliveryWindow = `${check.distance}km (~${Math.ceil(check.distance! * 3 + 25)} mins)`
          } else if (values.deliveryZoneId) {
            const zone = await getDeliveryZoneByIdCached(supabase, values.deliveryZoneId)
            if (zone) {
              const isNairobi = zone.name.toLowerCase().includes("nairobi")
              const unitPrice = getPizzaUnitPrice(values.pizzaSize, values.pizzaType, toppingsCount)
              const totalItemsValue = unitPrice * safeQuantity

              if (isNairobi && totalItemsValue < 2000) {
                return { success: false, error: "Nairobi pizza orders require a minimum value of KES 2,000" }
              }

              deliveryFee = zone.delivery_fee
              deliveryWindow = zone.delivery_window
            }
          } else {
            return { success: false, error: "Please select a delivery location" }
          }
          if (!deliveryAddress) {
            return { success: false, error: "Please provide a delivery address or landmark." }
          }
        }

        if (storeSettings.busyModeEnabled && storeSettings.busyModeAction === "increase_eta") {
          deliveryWindow = applyBusyEtaWindow(deliveryWindow, storeSettings.busyModeExtraMinutes)
        }

        const unitPrice = getPizzaUnitPrice(values.pizzaSize, values.pizzaType, toppingsCount)
        const quantity = safeQuantity || 1
        const rawSubtotal = unitPrice * quantity
        const offer = getPizzaOfferDetails({
          size: values.pizzaSize,
          quantity,
          unitPrice,
        })
        const itemTotal = rawSubtotal - offer.discount
        const total = itemTotal + deliveryFee
        const paymentPlanRaw = values.paymentPlan || "full"
        if (paymentPlanRaw !== "full" && paymentPlanRaw !== "deposit") {
          return { success: false, error: "Invalid payment plan." }
        }
        const paymentPlan = paymentPlanRaw as "full" | "deposit"
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
              customer_name: customerName,
              phone: normalizedPhone,
              delivery_zone_id: values.deliveryZoneId || null,
              delivery_window: deliveryWindow,
              delivery_fee: deliveryFee,
              delivery_lat: safeDeliveryLat,
              delivery_lng: safeDeliveryLng,
              delivery_address: deliveryAddress || null,
              total_amount: total,
              preferred_date: preferredDate,
              status: "order_received",
              payment_method: values.paymentMethod || "mpesa",
              payment_status: getInitialPaymentStatus(values.paymentMethod || "mpesa", values.fulfilment, paymentPlan),
              payment_plan: paymentPlan,
              payment_amount_paid: 0,
              payment_amount_due: total,
              payment_deposit_amount: depositAmount,
              mpesa_phone: values.paymentMethod === "mpesa" ? normalizedMpesaPhone : null,
            })
            .select("id")
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

        const extrasNote =
          toppingsCount > 0 ? `Extras: ${toppings.join(", ")} (+${(toppingsCount * 100).toLocaleString()} KES)` : ""
        const offerNote = offer.discount > 0 ? `Offer: 2-for-1 applied (${offer.freeQuantity} free)` : ""
        const combinedNotes = [notes, extrasNote, offerNote].filter(Boolean).join(" | ")

        const { error: itemError } = await supabase.from("order_items").insert({
          order_id: order.id,
          item_name: `${values.pizzaSize} ${values.pizzaType} Pizza`,
          quantity: safeQuantity,
          notes: combinedNotes,
        })

        if (itemError) throw itemError

        console.log(`[ORDER-CREATE][${correlationId}] Pizza order created`, {
          orderId: order.id,
          phone: normalizedPhone,
          total,
          paymentPlan,
        })

        return { success: true, orderId: order.id }
      },
    })

    if (guarded.state === "in_progress") {
      return { success: false, error: "Duplicate request in progress. Please wait a few seconds." }
    }

    return guarded.result
  } catch (error) {
    console.error(`[ORDER-CREATE][${correlationId}] Error submitting pizza order:`, error)
    return { success: false, error: "Database error. Please try again." }
  }
}
