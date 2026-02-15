import { TrendingUp, Wallet, Receipt, Clock3, Pizza, CakeSlice } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DailyMetrics = {
  todayOrders: number
  todayRevenue: number
  pendingPaymentsToday: number
  paidToday: number
  unpaidToday: number
  topItemToday: string
  weekRevenue: number
}

type WeeklyPoint = {
  label: string
  revenue: number
  orders: number
}

type Insights = {
  bestCake: string
  bestPizza: string
  peakHour: string
}

export default function AdminAnalyticsOverview({
  metrics,
  weekly,
  insights,
}: {
  metrics: DailyMetrics
  weekly: WeeklyPoint[]
  insights: Insights
}) {
  const maxRevenue = Math.max(...weekly.map((day) => day.revenue), 1)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Today Orders"
          value={metrics.todayOrders.toLocaleString()}
          icon={Receipt}
          tone="slate"
        />
        <StatCard
          title="Revenue Today"
          value={`${metrics.todayRevenue.toLocaleString()} KES`}
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          title="Pending Payments"
          value={metrics.pendingPaymentsToday.toLocaleString()}
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          title="Paid vs Unpaid"
          value={`${metrics.paidToday} / ${metrics.unpaidToday}`}
          icon={TrendingUp}
          tone="blue"
          subtitle="Today"
        />
        <StatCard
          title="Week Revenue"
          value={`${metrics.weekRevenue.toLocaleString()} KES`}
          icon={TrendingUp}
          tone="purple"
        />
        <StatCard
          title="Top Item"
          value={metrics.topItemToday}
          icon={metrics.topItemToday.toLowerCase().includes("pizza") ? Pizza : CakeSlice}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/60 bg-white/90 shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)] backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Weekly Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weekly.map((day) => {
              const width = Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 6 : 0)
              return (
                <div key={day.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{day.label}</span>
                    <span>{day.orders} orders</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,#4d66e8,#d82f7d)]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-700">{day.revenue.toLocaleString()} KES</div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/90 shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)] backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Order Insights</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InsightItem label="Best Selling Cake" value={insights.bestCake} icon={CakeSlice} />
            <InsightItem label="Best Selling Pizza" value={insights.bestPizza} icon={Pizza} />
            <InsightItem label="Peak Order Time" value={insights.peakHour} icon={Clock3} />
            <InsightItem label="Top Item Today" value={metrics.topItemToday} icon={TrendingUp} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
  subtitle,
}: {
  title: string
  value: string
  icon: any
  tone: "slate" | "emerald" | "amber" | "blue" | "purple"
  subtitle?: string
}) {
  const toneStyles: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  }

  return (
    <Card className="border-white/60 bg-white/90 shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)] backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${toneStyles[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function InsightItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: any
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}
