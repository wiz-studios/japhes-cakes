import { NextResponse } from "next/server"
import { createServiceSupabaseClient } from "@/lib/supabase-service"

type SystemMode = "normal" | "degraded"

const DEGRADE_PENDING_THRESHOLD = Number(process.env.PAYMENT_DELAY_PENDING_THRESHOLD || 8)
const DEGRADE_FAILURE_THRESHOLD = Number(process.env.PAYMENT_DELAY_FAILURE_THRESHOLD || 5)
const DEGRADE_PENDING_AGE_MINUTES = Number(process.env.PAYMENT_DELAY_PENDING_AGE_MINUTES || 5)
const DEGRADE_FAILURE_WINDOW_MINUTES = Number(process.env.PAYMENT_DELAY_FAILURE_WINDOW_MINUTES || 15)

function getOverrideMode(): SystemMode | null {
  const raw = (process.env.PAYMENT_SYSTEM_STATUS || "").trim().toLowerCase()
  if (raw === "normal" || raw === "degraded") return raw
  return null
}

export async function GET() {
  const override = getOverrideMode()
  if (override) {
    return NextResponse.json(
      {
        mode: override,
        label: override === "normal" ? "All systems normal" : "M-Pesa confirmations delayed",
        message:
          override === "normal"
            ? "Orders and payment callbacks are flowing normally."
            : "Payment confirmations are slower than usual. Keep your order number while we process callbacks.",
        source: "override",
        checkedAt: new Date().toISOString(),
      },
      { status: 200 }
    )
  }

  try {
    const supabase = createServiceSupabaseClient()
    const stalePendingBefore = new Date(Date.now() - DEGRADE_PENDING_AGE_MINUTES * 60 * 1000).toISOString()
    const failureWindowStart = new Date(Date.now() - DEGRADE_FAILURE_WINDOW_MINUTES * 60 * 1000).toISOString()

    const [pendingResult, failedAttemptsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_method", "mpesa")
        .in("payment_status", ["pending", "initiated"])
        .lt("created_at", stalePendingBefore),
      supabase
        .from("payment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", failureWindowStart),
    ])

    const stalePendingCount = Number(pendingResult.count || 0)
    const recentFailureCount = Number(failedAttemptsResult.count || 0)
    const isDegraded = stalePendingCount >= DEGRADE_PENDING_THRESHOLD || recentFailureCount >= DEGRADE_FAILURE_THRESHOLD

    const mode: SystemMode = isDegraded ? "degraded" : "normal"
    const label = isDegraded ? "M-Pesa confirmations delayed" : "All systems normal"
    const message = isDegraded
      ? "Some STK and callback updates are taking longer than usual. Keep your order number and retry after a short wait."
      : "Orders and payment callbacks are flowing normally."

    return NextResponse.json(
      {
        mode,
        label,
        message,
        checkedAt: new Date().toISOString(),
        source: "auto",
        metrics: {
          stalePendingCount,
          recentFailureCount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[system-status] Failed to compute status:", error)
    return NextResponse.json(
      {
        mode: "degraded",
        label: "M-Pesa status unavailable",
        message: "We are unable to verify payment callback health right now. Please keep your order number.",
        checkedAt: new Date().toISOString(),
        source: "fallback",
      },
      { status: 200 }
    )
  }
}
