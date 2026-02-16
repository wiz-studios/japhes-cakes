import { createServerSupabaseClient } from "@/lib/supabase-server"
import { normalizeStoreSettings } from "@/lib/store-settings"
import AdminOrderTable from "@/components/AdminOrderTable"
import AdminAnalyticsOverview from "@/components/admin/AdminAnalyticsOverview"
import BusyModePanel from "@/components/admin/BusyModePanel"

type DashboardOrder = {
  id: string
  friendly_id?: string | null
  created_at: string
  customer_name: string | null
  status: string
  payment_status: string | null
  payment_method: string | null
  payment_amount_paid: number | null
  payment_deposit_amount: number | null
  total_amount: number | null
  order_type: "cake" | "pizza"
  fulfilment: string
  order_items?: { item_name: string; quantity: number | null }[]
  delivery_zones?: { name: string } | null
}

const NAIROBI_TZ = "Africa/Nairobi"

function toNairobiDate(dateInput: string | Date) {
  return new Date(new Date(dateInput).toLocaleString("en-US", { timeZone: NAIROBI_TZ }))
}

function getDayKey(dateInput: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateInput))
}

function getRevenueContribution(order: DashboardOrder) {
  const totalAmount = Number(order.total_amount || 0)
  const paidAmount = Number(order.payment_amount_paid || 0)
  const depositFallback = Number(order.payment_deposit_amount || Math.ceil(totalAmount * 0.5))

  if (paidAmount > 0) return paidAmount
  if (order.payment_status === "paid") return totalAmount
  if (order.payment_status === "deposit_paid") return depositFallback
  return 0
}

function incrementCount<T extends string | number>(map: Map<T, number>, key: T, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount)
}

function formatHourRange(hour: number) {
  const start = hour % 12 === 0 ? 12 : hour % 12
  const startSuffix = hour >= 12 ? "PM" : "AM"
  const endHour = (hour + 1) % 24
  const end = endHour % 12 === 0 ? 12 : endHour % 12
  const endSuffix = endHour >= 12 ? "PM" : "AM"
  return `${start} ${startSuffix} - ${end} ${endSuffix}`
}

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient()

  const [{ data: orders }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(item_name, quantity), delivery_zones(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("store_settings")
      .select("busy_mode_enabled, busy_mode_action, busy_mode_extra_minutes, busy_mode_message")
      .eq("id", true)
      .maybeSingle(),
  ])

  const fullOrders = (orders || []) as DashboardOrder[]
  const activeOrders = fullOrders.filter((order) => order.status !== "cancelled")

  const todayKey = getDayKey(new Date())
  const todayOrders = activeOrders.filter((order) => getDayKey(order.created_at) === todayKey)

  const todayRevenue = todayOrders.reduce((sum, order) => sum + getRevenueContribution(order), 0)
  const pendingPaymentsToday = todayOrders.filter((order) => order.payment_status !== "paid").length
  const paidToday = todayOrders.filter((order) => order.payment_status === "paid").length
  const unpaidToday = Math.max(todayOrders.length - paidToday, 0)

  const todayItemCounter = new Map<string, number>()
  for (const order of todayOrders) {
    for (const item of order.order_items || []) {
      incrementCount(todayItemCounter, item.item_name || "Unknown item", Number(item.quantity || 1))
    }
  }
  const topItemToday =
    [...todayItemCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "No orders yet"

  const nowNairobi = toNairobiDate(new Date())
  const weekStart = new Date(nowNairobi)
  const dayOffset = (weekStart.getDay() + 6) % 7
  weekStart.setDate(weekStart.getDate() - dayOffset)
  weekStart.setHours(0, 0, 0, 0)
  const weekRevenue = activeOrders.reduce((sum, order) => {
    const orderNairobi = toNairobiDate(order.created_at)
    if (orderNairobi >= weekStart && orderNairobi <= nowNairobi) {
      return sum + getRevenueContribution(order)
    }
    return sum
  }, 0)

  const weeklyTemplate = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(nowNairobi)
    date.setDate(nowNairobi.getDate() - (6 - index))
    date.setHours(0, 0, 0, 0)
    const label = new Intl.DateTimeFormat("en-GB", {
      timeZone: NAIROBI_TZ,
      weekday: "short",
      day: "numeric",
    }).format(date)
    return {
      key: getDayKey(date),
      label,
      revenue: 0,
      orders: 0,
    }
  })

  const weeklyMap = new Map(weeklyTemplate.map((point) => [point.key, point]))
  for (const order of activeOrders) {
    const key = getDayKey(order.created_at)
    const point = weeklyMap.get(key)
    if (!point) continue
    point.orders += 1
    point.revenue += getRevenueContribution(order)
  }

  const cakeCounter = new Map<string, number>()
  const pizzaCounter = new Map<string, number>()
  const hourlyCounter = new Map<number, number>()
  for (const order of activeOrders) {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: NAIROBI_TZ,
        hour: "2-digit",
        hour12: false,
      }).format(new Date(order.created_at))
    )
    incrementCount(hourlyCounter, hour)

    for (const item of order.order_items || []) {
      const qty = Number(item.quantity || 1)
      if (order.order_type === "cake") incrementCount(cakeCounter, item.item_name || "Unknown cake", qty)
      if (order.order_type === "pizza") incrementCount(pizzaCounter, item.item_name || "Unknown pizza", qty)
    }
  }

  const bestCake = [...cakeCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "No cake orders yet"
  const bestPizza = [...pizzaCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "No pizza orders yet"
  const peakHourRaw = [...hourlyCounter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const peakHour = Number.isFinite(peakHourRaw) ? formatHourRange(Number(peakHourRaw)) : "No data yet"

  const settings = normalizeStoreSettings(settingsRow)

  return (
    <div className="space-y-6">
      <AdminOrderTable orders={activeOrders} />

      <BusyModePanel initial={settings} />

      <AdminAnalyticsOverview
        metrics={{
          todayOrders: todayOrders.length,
          todayRevenue,
          pendingPaymentsToday,
          paidToday,
          unpaidToday,
          topItemToday,
          weekRevenue,
        }}
        weekly={weeklyTemplate.map(({ label, revenue, orders }) => ({ label, revenue, orders }))}
        insights={{
          bestCake,
          bestPizza,
          peakHour,
        }}
      />
    </div>
  )
}
