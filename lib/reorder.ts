import { CAKE_FLAVORS, CAKE_SIZES } from "@/lib/cake-pricing"
import { normalizeKenyaPhone } from "@/lib/phone"
import { PIZZA_BASE_PRICES, PIZZA_TYPE_PRICES } from "@/lib/pizza-pricing"
import { getNairobiHour } from "@/lib/time"

type ReorderItem = {
  item_name?: string | null
  quantity?: number | null
  notes?: string | null
}

type ReorderSourceOrder = {
  order_type?: string | null
  fulfilment?: string | null
  customer_name?: string | null
  phone?: string | null
  delivery_fee?: number | null
  delivery_zone_id?: string | null
  preferred_date?: string | null
  order_items?: ReorderItem[] | null
  delivery_zones?: { name?: string | null }[] | { name?: string | null } | null
}

const PIZZA_SIZES = Object.keys(PIZZA_BASE_PRICES).sort((a, b) => b.length - a.length)
const PIZZA_TYPES = Object.keys(PIZZA_TYPE_PRICES)

function pickDeliveryZoneName(order: ReorderSourceOrder) {
  if (Array.isArray(order.delivery_zones)) {
    return order.delivery_zones[0]?.name || ""
  }
  return order.delivery_zones?.name || ""
}

function parsePizzaItemName(rawName: string) {
  let name = rawName.trim()
  if (/ pizza$/i.test(name)) {
    name = name.replace(/ pizza$/i, "").trim()
  }

  const size = PIZZA_SIZES.find((candidate) => name.toLowerCase().startsWith(`${candidate.toLowerCase()} `))
  let pizzaType = size ? name.slice(size.length).trim() : name

  const exactType = PIZZA_TYPES.find((candidate) => candidate.toLowerCase() === pizzaType.toLowerCase())
  if (!exactType) {
    const containsType = PIZZA_TYPES.find((candidate) => name.toLowerCase().includes(candidate.toLowerCase()))
    pizzaType = containsType || "Margherita"
  } else {
    pizzaType = exactType
  }

  return {
    pizzaSize: size || "Medium",
    pizzaType,
  }
}

function parsePizzaNotes(rawNotes: string) {
  const notes = rawNotes.trim()
  if (!notes) return { notes: "", extraCheese: false, extraToppings: false }

  const extraCheese = /extra\s+cheese/i.test(notes)
  const extraToppings = /extra\s+toppings/i.test(notes)

  const plainNotes = notes
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !/^extras:/i.test(entry) && !/^offer:/i.test(entry))
    .join(" | ")

  return { notes: plainNotes, extraCheese, extraToppings }
}

function parseCakeItemName(rawName: string) {
  const name = rawName.trim()
  const cakeSize = CAKE_SIZES.find((size) => new RegExp(`\\b${size}\\b`, "i").test(name)) || "1kg"

  const stripped = name
    .replace(new RegExp(`^\\s*${cakeSize}\\s*`, "i"), "")
    .replace(/cake$/i, "")
    .trim()

  const exactFlavor = CAKE_FLAVORS.find((flavor) => flavor.toLowerCase() === stripped.toLowerCase())
  const containsFlavor = CAKE_FLAVORS.find((flavor) => stripped.toLowerCase().includes(flavor.toLowerCase()))
  const cakeFlavor = exactFlavor || containsFlavor || "Vanilla"

  return { cakeSize, cakeFlavor }
}

function parseCakeNotes(rawNotes: string) {
  const notes = rawNotes.trim()
  if (!notes) return { designNotes: "", cakeMessage: "" }

  const structured = notes.match(/Design:\s*(.*?)\.\s*Message:\s*(.*)$/i)
  if (!structured) {
    return { designNotes: notes, cakeMessage: "" }
  }

  const designNotes = structured[1]?.trim() || ""
  const cakeMessage = structured[2]?.trim() || ""

  return {
    designNotes: /^none$/i.test(designNotes) ? "" : designNotes,
    cakeMessage: /^none$/i.test(cakeMessage) ? "" : cakeMessage,
  }
}

function getTodayYmd() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function safeFulfilment(value: string | null | undefined) {
  return value === "delivery" ? "delivery" : "pickup"
}

export function buildReorderPayload(order: ReorderSourceOrder) {
  const item = order.order_items?.[0] || {}
  const itemName = item.item_name || ""
  const itemNotes = item.notes || ""
  const quantity = Number(item.quantity || 1)
  const customerName = (order.customer_name || "").trim()
  const phone = normalizeKenyaPhone(order.phone || "")
  const fulfilment = safeFulfilment(order.fulfilment)
  const deliveryZone = pickDeliveryZoneName(order)
  const deliveryFee = Number(order.delivery_fee || 0)

  if (order.order_type === "cake") {
    const { cakeSize, cakeFlavor } = parseCakeItemName(itemName)
    const { designNotes, cakeMessage } = parseCakeNotes(itemNotes)
    const today = getTodayYmd()
    const sourceDate = (order.preferred_date || "").slice(0, 10)
    const scheduledDate = sourceDate && sourceDate >= today ? sourceDate : today

    return {
      type: "cake",
      items: [
        {
          name: itemName || `${cakeFlavor} Cake`,
          quantity: 1,
          size: cakeSize,
          flavor: cakeFlavor,
          notes: designNotes,
          message: cakeMessage,
          designImageUrl: "",
        },
      ],
      deliveryFee,
      fulfilment,
      deliveryZone,
      deliveryZoneId: order.delivery_zone_id || "",
      customerName,
      scheduledDate,
      placedHour: getNairobiHour(),
      phone,
    }
  }

  const { pizzaSize, pizzaType } = parsePizzaItemName(itemName)
  const { notes, extraCheese, extraToppings } = parsePizzaNotes(itemNotes)

  return {
    type: "pizza",
    items: [
      {
        name: pizzaType,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        size: pizzaSize,
        toppings: [
          ...(extraCheese ? ["Extra Cheese"] : []),
          ...(extraToppings ? ["Extra Toppings"] : []),
        ],
        notes,
      },
    ],
    deliveryFee,
    fulfilment,
    deliveryZone,
    deliveryZoneId: order.delivery_zone_id || "",
    customerName,
    placedHour: getNairobiHour(),
    phone,
  }
}

export function buildReorderHref(order: ReorderSourceOrder) {
  const payload = buildReorderPayload(order)
  const destination = payload.type === "cake" ? "/order/cake" : "/order/pizza"
  return `${destination}?order=${encodeURIComponent(JSON.stringify(payload))}`
}
