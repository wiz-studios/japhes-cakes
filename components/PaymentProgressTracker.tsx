"use client"

import { Check, Circle, X } from "lucide-react"

export type PaymentProgressState = "idle" | "initiated" | "prompted" | "success" | "failed"

type StepVisualState = "pending" | "active" | "complete" | "failed"

function getStepState(step: 0 | 1 | 2, progress: PaymentProgressState): StepVisualState {
  if (progress === "idle") return "pending"
  if (progress === "initiated") {
    if (step === 0) return "active"
    return "pending"
  }
  if (progress === "prompted") {
    if (step === 0) return "complete"
    if (step === 1) return "active"
    return "pending"
  }
  if (progress === "success") {
    return "complete"
  }
  if (progress === "failed") {
    if (step === 2) return "failed"
    return "complete"
  }
  return "pending"
}

function getStepTone(state: StepVisualState) {
  if (state === "complete") return "border-emerald-300 bg-emerald-100 text-emerald-700"
  if (state === "active") return "border-amber-300 bg-amber-100 text-amber-700"
  if (state === "failed") return "border-rose-300 bg-rose-100 text-rose-700"
  return "border-slate-300 bg-white text-slate-400"
}

export function paymentStatusToProgressState(status: string | null | undefined): PaymentProgressState {
  const normalized = String(status || "").toLowerCase()
  if (normalized === "paid" || normalized === "deposit_paid") return "success"
  if (normalized === "failed" || normalized === "expired") return "failed"
  if (normalized === "initiated") return "prompted"
  if (normalized === "pending") return "initiated"
  return "idle"
}

export default function PaymentProgressTracker({
  state,
  className = "",
}: {
  state: PaymentProgressState
  className?: string
}) {
  const finalLabel = state === "failed" ? "Failed" : "Confirmed"
  const labels = ["Initiated", "STK Sent", finalLabel] as const

  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-4 py-3 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Payment Progress</p>
      <div className="mt-3 flex items-start">
        {labels.map((label, idx) => {
          const stepState = getStepState(idx as 0 | 1 | 2, state)
          const tone = getStepTone(stepState)
          const connectorActive = state === "success" || state === "failed" || (state === "prompted" && idx === 0)
          return (
            <div key={label} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center text-center">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${tone}`}>
                  {stepState === "complete" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : stepState === "failed" ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
              </div>
              {idx < labels.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${connectorActive ? "bg-slate-500" : "bg-slate-200"}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
