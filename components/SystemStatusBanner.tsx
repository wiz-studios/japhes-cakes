"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { usePathname } from "next/navigation"

type SystemStatusPayload = {
  mode?: "normal" | "degraded"
  label?: string
  message?: string
}

type BannerMode = "normal" | "degraded"

export default function SystemStatusBanner({
  compact = false,
  onlyOrderPages = false,
}: {
  compact?: boolean
  onlyOrderPages?: boolean
}) {
  const pathname = usePathname()
  const isOrderPage = pathname?.startsWith("/order")
  const isStaffArea =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/kitchen") ||
    pathname?.startsWith("/delivery") ||
    pathname?.startsWith("/staff")

  const [status, setStatus] = useState<BannerMode>("normal")
  const [label, setLabel] = useState("All systems normal")
  const [message, setMessage] = useState("Orders and payment callbacks are flowing normally.")

  useEffect(() => {
    let mounted = true

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/system-status", {
          method: "GET",
          cache: "no-store",
        })
        if (!response.ok) return
        const payload = (await response.json()) as SystemStatusPayload
        if (!mounted) return
        const nextMode: BannerMode = payload.mode === "degraded" ? "degraded" : "normal"
        setStatus(nextMode)
        setLabel(payload.label || (nextMode === "normal" ? "All systems normal" : "M-Pesa confirmations delayed"))
        setMessage(
          payload.message ||
            (nextMode === "normal"
              ? "Orders and payment callbacks are flowing normally."
              : "Some callback updates are slower than usual.")
        )
      } catch {
        if (!mounted) return
        setStatus("degraded")
        setLabel("M-Pesa status unavailable")
        setMessage("We could not verify callback health right now. Keep your order number while we process updates.")
      }
    }

    void loadStatus()
    const interval = setInterval(() => {
      void loadStatus()
    }, 60000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const tone = useMemo(() => {
    if (status === "degraded") {
      return {
        wrapper: "border-amber-300 bg-amber-50/95 text-amber-900",
        iconClass: "text-amber-700",
        Icon: AlertTriangle,
      }
    }
    return {
      wrapper: "border-emerald-300 bg-emerald-50/95 text-emerald-900",
      iconClass: "text-emerald-700",
      Icon: CheckCircle2,
    }
  }, [status])

  const Icon = tone.Icon

  if (isStaffArea) return null
  if (onlyOrderPages && !isOrderPage) return null

  return (
    <div className={`border-t border-white/40 px-4 py-2 ${tone.wrapper}`}>
      <div className="mx-auto flex w-full max-w-6xl items-start gap-2.5 md:items-center">
        <Icon className={`h-4 w-4 shrink-0 ${tone.iconClass}`} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">{label}</p>
          {!compact && <p className="mt-0.5 text-xs text-current/80">{message}</p>}
        </div>
      </div>
    </div>
  )
}
