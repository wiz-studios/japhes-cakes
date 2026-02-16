"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Images, LayoutDashboard, MapPin, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Scheduled Pizza", href: "/admin/recent-scheduled-pizza", icon: CalendarDays },
  { label: "School Gallery", href: "/admin/school-gallery", icon: Images },
  { label: "Delivery Zones", href: "/admin/zones", icon: MapPin },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLogin = pathname === "/admin/login"

  if (isLogin) {
    return (
      <div className="min-h-screen bg-[linear-gradient(140deg,#f6f2f7_0%,#efeaf4_55%,#ece6f1_100%)] px-6 py-12">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Admin Access</p>
            <h1 className="text-2xl font-semibold text-slate-900 font-serif">Japhe's Admin Console</h1>
            <p className="mt-2 text-sm text-slate-600">Secure sign-in for order management.</p>
          </div>
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-[0_20px_60px_-50px_rgba(15,20,40,0.45)] backdrop-blur">
              <Image src="/logo.png" alt="Japhe's Cakes & Pizza logo" width={180} height={56} className="h-auto w-[180px]" priority />
            </div>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            <div className="rounded-xl border border-white/60 bg-white/65 px-2 py-2 shadow-sm">Orders First</div>
            <div className="rounded-xl border border-white/60 bg-white/65 px-2 py-2 shadow-sm">Secure Access</div>
            <div className="rounded-xl border border-white/60 bg-white/65 px-2 py-2 shadow-sm">Live Updates</div>
          </div>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f3f7] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-white/10 bg-[linear-gradient(180deg,#0f1016_0%,#141626_100%)] px-6 py-8 text-white lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">Admin</p>
              <p className="text-lg font-semibold">Operations Hub</p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition",
                    isActive ? "bg-white text-slate-900" : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
            Admin tools only. Customer actions are disabled in this space.
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-white/60 bg-white/85 px-6 py-4 backdrop-blur-xl">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admin Console</p>
                <h2 className="font-serif text-xl font-semibold text-slate-900">Operational Dashboard</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/Japhes_Letterhead_Template.docx"
                  download
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Download Letterhead
                </a>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                  Logged in as admin
                </div>
              </div>
            </div>
            <div className="mt-4 flex w-full max-w-full gap-2 overflow-x-auto pb-1 pr-1 lg:hidden">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition",
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </header>

          <main className="flex-1 max-w-full overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  )
}
