"use client"

import { useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

type StatusAutoRefreshProps = {
  intervalMs?: number
}

export default function StatusAutoRefresh({ intervalMs = 10_000 }: StatusAutoRefreshProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const refreshNow = useCallback(() => {
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => {
      refreshNow()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [intervalMs, refreshNow])

  return (
    <button
      type="button"
      onClick={refreshNow}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-50 disabled:opacity-70"
      disabled={isPending}
      title="Refresh now (auto refresh every 10 seconds)"
      aria-label="Refresh order status now"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      Refresh
    </button>
  )
}

