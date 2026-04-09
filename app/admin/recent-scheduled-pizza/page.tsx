import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateNairobi, formatDateTimeNairobi, getNairobiDayKey, getNairobiHour } from "@/lib/time"


// RecentScheduledPizzaOrders: Admin panel to view pizza orders placed after 9 PM and their scheduled dates
// This helps verify the late-night cutoff logic in production.
export default async function RecentScheduledPizzaOrders() {
  // Get Supabase server client
  const supabase = await createServerSupabaseClient()
  // Call the custom RPC to get recent scheduled pizza orders
  // Africa/Nairobi timezone offset is +3
  const { data: rpcOrders, error: rpcError } = await supabase.rpc("get_recent_scheduled_pizza_orders")

  let orders = rpcOrders

  if (rpcError) {
    const { data: fallbackOrders } = await supabase
      .from("orders")
      .select("id, customer_name, created_at, preferred_date, status, payment_status, order_type")
      .eq("order_type", "pizza")
      .order("created_at", { ascending: false })
      .limit(200)

    orders = (fallbackOrders || [])
      .filter((order) => {
        if (!order.created_at) return false
        return getNairobiHour(new Date(order.created_at)) >= 21
      })
      .map((order) => ({
        order_id: order.id,
        customer_name: order.customer_name,
        placed_at: order.created_at,
        scheduled_date: order.preferred_date,
        status: order.status,
        payment_status: order.payment_status,
      }))
  }

  // Render the admin table
  return (
    // Main container for the admin panel
    <div className="mx-auto max-w-4xl py-8">
      {/* Title */}
      <h2 className="mb-6 text-balance text-2xl font-bold">Recent Scheduled Pizza Orders (After 9 PM)</h2>
      {/* Refresh button to reload the page */}
      <form action="/admin/recent-scheduled-pizza">
        <Button type="submit" variant="outline" className="mb-4">Refresh</Button>
      </form>
      {/* Table container */}
      <div className="space-y-4">
        <div className="grid gap-4 md:hidden">
          {orders?.map((order: any) => {
            const placed = new Date(order.placed_at)
            const scheduled = order.scheduled_date ? new Date(order.scheduled_date) : null
            const shifted = scheduled
              ? getNairobiDayKey(placed) !== getNairobiDayKey(scheduled)
              : false

            return (
              <article
                key={order.order_id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${shifted ? "border-red-200 bg-red-50/70" : "border-slate-200"}`}
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-mono font-semibold text-slate-900">{order.order_id}</p>
                    <p className="mt-1 text-slate-700">{order.customer_name || "Guest"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Placed At</p>
                    <p className="mt-1 text-slate-700">{formatDateTimeNairobi(placed)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Scheduled Date</p>
                    <p className="mt-1 text-slate-700">
                      {scheduled ? formatDateNairobi(scheduled) : "N/A"}
                      {shifted ? " (Shifted)" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{order.status}</Badge>
                    <Badge variant={order.payment_status === "paid" ? "default" : "outline"}>{order.payment_status}</Badge>
                  </div>
                </div>
              </article>
            )
          })}
          {(!orders || orders.length === 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No late-night pizza orders found.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-2">Order ID</th>
              <th className="px-4 py-2">Customer Name</th>
              <th className="px-4 py-2">Placed At</th>
              <th className="px-4 py-2">Scheduled Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Map through orders and render each row */}
            {orders?.map((order: any) => {
              const placed = new Date(order.placed_at)
              const scheduled = order.scheduled_date ? new Date(order.scheduled_date) : null
              // Highlight if scheduled date is different from placed date
              const shifted = scheduled
                ? getNairobiDayKey(placed) !== getNairobiDayKey(scheduled)
                : false
              return (
                <tr key={order.order_id} className={shifted ? "bg-red-100" : ""}>
                  <td className="px-4 py-2 font-mono">{order.order_id}</td>
                  <td className="px-4 py-2">{order.customer_name}</td>
                  <td className="px-4 py-2">{formatDateTimeNairobi(placed)}</td>
                  <td className="px-4 py-2">
                    {scheduled ? formatDateNairobi(scheduled) : "N/A"}
                    {shifted && (
                      // Show a note if the order was shifted to the next day
                      <span className="ml-2 text-xs text-red-600" title="Order placed after 9 PM, scheduled for next day">(Shifted)</span>
                    )}
                  </td>
                  <td className="px-4 py-2"><Badge>{order.status}</Badge></td>
                  <td className="px-4 py-2"><Badge variant={order.payment_status === "paid" ? "default" : "outline"}>{order.payment_status}</Badge></td>
                </tr>
              )
            })}
            {/* Show a message if there are no late-night pizza orders */}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">No late-night pizza orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      {/* Explanatory note for admins */}
      <div className="mt-4 text-xs text-muted-foreground">
        <span className="font-bold">Note:</span> Orders placed after 9:00 PM are automatically scheduled for the next day. Rows highlighted in red indicate this shift.
      </div>
    </div>
  )
}
