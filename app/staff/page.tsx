import Link from "next/link"
import { Bike, CookingPot, LayoutDashboard, ShieldCheck } from "lucide-react"

const staffLinks = [
  {
    title: "Admin Dashboard",
    description: "Manage orders, zones, and schedules.",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Kitchen Display",
    description: "Live queue for prep and bake.",
    href: "/kitchen",
    icon: CookingPot,
  },
  {
    title: "Delivery Console",
    description: "Dispatch-ready orders and routes.",
    href: "/delivery",
    icon: Bike,
  },
]

export default function StaffLandingPage() {
  return (
    <div className="relative min-h-screen bg-[linear-gradient(160deg,#0f1016_0%,#141827_50%,#1b1f34_100%)] px-6 py-16 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Staff Access
            </div>
            <h1 className="mt-5 text-3xl font-semibold md:text-4xl font-serif">Japhe's Operations Hub</h1>
            <p className="mt-3 max-w-xl text-sm text-white/70">
              Dedicated internal pages for staff. Customer ordering actions are intentionally disabled here.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Verified staff only
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {staffLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/10"
              >
                <div>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/80 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">{link.title}</h2>
                  <p className="mt-2 text-sm text-white/60">{link.description}</p>
                </div>
                <div className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                  Open Console
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
