import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { normalizeStoreSettings } from "@/lib/store-settings"
import AdminOrderTable from "@/components/AdminOrderTable"
import AdminAnalyticsOverview from "@/components/admin/AdminAnalyticsOverview"
import BusyModePanel from "@/components/admin/BusyModePanel"
import { NAIROBI_TIME_ZONE, getNairobiDayKey, getNairobiHour, toNairobiDate } from "@/lib/time"

type DashboardOrder = {
  id: string
  friendly_id?: string | null
  created_at: string
  customer_name: string | null
  phone: string | null
  status: string
  payment_status: string | null
  payment_method: string | null
  payment_amount_paid: number | null
  payment_deposit_amount: number | null
  total_amount: number | null
  order_type: "cake" | "pizza"
  fulfilment: string
  order_items?: { item_name: string; quantity: number | null }[]
  delivery_zones?: { name: string }[] | { name: string } | null
}

const ORDER_SELECT =
  "id, friendly_id, created_at, customer_name, phone, status, payment_status, payment_method, payment_amount_paid, payment_deposit_amount, total_amount, order_type, fulfilment, order_items(item_name, quantity), delivery_zones(name)"
const STATUS_OPTIONS = [
  "all",
  "order_received",
  "in_kitchen",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "collected",
  "cancelled",
]

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

function getDashboardPageSize() {
  const parsed = Number(process.env.ADMIN_DASHBOARD_PAGE_SIZE || 50)
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(parsed, 10), 200)
}

function sanitizeDateInput(value?: string) {
  if (!value) return undefined
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

function buildDashboardHref(params: {
  page?: number
  status?: string
  from?: string
  to?: string
}) {
  const search = new URLSearchParams()
  if (params.page && params.page > 1) search.set("page", String(params.page))
  if (params.status && params.status !== "all") search.set("status", params.status)
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  const query = search.toString()
  return query ? `/admin/dashboard?${query}` : "/admin/dashboard"
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string; from?: string; to?: string }>
}) {
  const params = (await searchParams) || {}
  const supabase = await createServerSupabaseClient()

  const rawStatus = (params.status || "all").toLowerCase()
  const statusFilter = STATUS_OPTIONS.includes(rawStatus) ? rawStatus : "all"
  const fromFilter = sanitizeDateInput(params.from)
  const toFilter = sanitizeDateInput(params.to)
  const pageSize = getDashboardPageSize()
  const page = Math.max(1, Number(params.page || 1) || 1)
  const rangeStart = (page - 1) * pageSize
  const rangeEnd = rangeStart + pageSize - 1

  let listQuery = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(rangeStart, rangeEnd)

  if (statusFilter !== "all") {
    listQuery = listQuery.eq("status", statusFilter)
  }
  if (fromFilter) {
    listQuery = listQuery.gte("created_at", `${fromFilter}T00:00:00.000Z`)
  }
  if (toFilter) {
    listQuery = listQuery.lte("created_at", `${toFilter}T23:59:59.999Z`)
  }

  const analyticsSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  let analyticsQuery = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .gte("created_at", analyticsSince)
    .order("created_at", { ascending: false })
    .limit(1500)

  if (statusFilter !== "all") {
    analyticsQuery = analyticsQuery.eq("status", statusFilter)
  }
  if (fromFilter) {
    analyticsQuery = analyticsQuery.gte("created_at", `${fromFilter}T00:00:00.000Z`)
  }
  if (toFilter) {
    analyticsQuery = analyticsQuery.lte("created_at", `${toFilter}T23:59:59.999Z`)
  }

  const [ordersResult, settingsResult, analyticsResult] = await Promise.all([
    listQuery,
    supabase
      .from("store_settings")
      .select("busy_mode_enabled, busy_mode_action, busy_mode_extra_minutes, busy_mode_message")
      .eq("id", true)
      .maybeSingle(),
    analyticsQuery,
  ])

  const fullOrders = (ordersResult.data || []) as unknown as DashboardOrder[]
  const totalOrders = Number(ordersResult.count || 0)
  const totalPages = Math.max(Math.ceil(totalOrders / pageSize), 1)
  const activeOrders = fullOrders.filter((order) => order.status !== "cancelled")

  const analyticsOrders = ((analyticsResult.data || []) as unknown as DashboardOrder[]).filter(
    (order) => order.status !== "cancelled"
  )
  const tableOrders = activeOrders.map((order) => ({
    ...order,
    customer_name: order.customer_name || "Guest",
    payment_status: order.payment_status || "pending",
    total_amount: Number(order.total_amount || 0),
  }))

  const todayKey = getNairobiDayKey(new Date())
  const todayOrders = analyticsOrders.filter((order) => getNairobiDayKey(order.created_at) === todayKey)

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
  const weekRevenue = analyticsOrders.reduce((sum, order) => {
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
      timeZone: NAIROBI_TIME_ZONE,
      weekday: "short",
      day: "numeric",
    }).format(date)
    return {
      key: getNairobiDayKey(date),
      label,
      revenue: 0,
      orders: 0,
    }
  })

  const weeklyMap = new Map(weeklyTemplate.map((point) => [point.key, point]))
  for (const order of analyticsOrders) {
    const key = getNairobiDayKey(order.created_at)
    const point = weeklyMap.get(key)
    if (!point) continue
    point.orders += 1
    point.revenue += getRevenueContribution(order)
  }

  const cakeCounter = new Map<string, number>()
  const pizzaCounter = new Map<string, number>()
  const hourlyCounter = new Map<number, number>()
  for (const order of analyticsOrders) {
    const hour = getNairobiHour(order.created_at)
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

  const settings = normalizeStoreSettings(settingsResult.data)

  const nowTs = Date.now()
  const overdueOrders = activeOrders.filter((order) => {
    const ageHours = (nowTs - new Date(order.created_at).getTime()) / (1000 * 60 * 60)
    return order.status !== "cancelled" && order.status !== "delivered" && order.status !== "collected" && ageHours >= 2
  })
  const pendingOver30m = activeOrders.filter((order) => {
    const ageMinutes = (nowTs - new Date(order.created_at).getTime()) / (1000 * 60)
    return order.payment_status === "pending" && ageMinutes >= 30
  })

  const showingStart = totalOrders === 0 ? 0 : rangeStart + 1
  const showingEnd = Math.min(rangeStart + fullOrders.length, totalOrders)
  const prevHref =
    page > 1
      ? buildDashboardHref({ page: page - 1, status: statusFilter, from: fromFilter, to: toFilter })
      : null
  const nextHref =
    page < totalPages
      ? buildDashboardHref({ page: page + 1, status: statusFilter, from: fromFilter, to: toFilter })
      : null

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)]">
        <form method="GET" className="grid gap-3 md:grid-cols-5">
          <input type="hidden" name="page" value="1" />
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="from"
            defaultValue={fromFilter || ""}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          />
          <input
            type="date"
            name="to"
            defaultValue={toFilter || ""}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Apply
          </button>
          <Link
            href="/admin/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset
          </Link>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            Showing {showingStart}-{showingEnd} of {totalOrders} orders
          </span>
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {totalPages}
            </span>
            {prevHref ? (
              <Link
                href={prevHref}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Prev
              </Link>
            ) : null}
            {nextHref ? (
              <Link
                href={nextHref}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Attention Queue</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Overdue orders</p>
            <p className="mt-1 text-2xl font-semibold text-rose-800">{overdueOrders.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Pending payment &gt; 30m</p>
            <p className="mt-1 text-2xl font-semibold text-amber-800">{pendingOver30m.length}</p>
          </div>
        </div>
      </section>

      <AdminOrderTable orders={tableOrders} />
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
