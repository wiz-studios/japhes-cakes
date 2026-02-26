import { AlertCircle, AlertTriangle, CheckCircle2, Info, Inbox } from "lucide-react"

type StateVariant = "empty" | "info" | "success" | "warning" | "error"

function toneForVariant(variant: StateVariant) {
  switch (variant) {
    case "success":
      return {
        icon: CheckCircle2,
        wrapper: "border-emerald-200 bg-emerald-50 text-emerald-800",
      }
    case "warning":
      return {
        icon: AlertTriangle,
        wrapper: "border-amber-200 bg-amber-50 text-amber-800",
      }
    case "error":
      return {
        icon: AlertCircle,
        wrapper: "border-rose-200 bg-rose-50 text-rose-800",
      }
    case "empty":
      return {
        icon: Inbox,
        wrapper: "border-slate-200 bg-slate-50 text-slate-700",
      }
    default:
      return {
        icon: Info,
        wrapper: "border-sky-200 bg-sky-50 text-sky-800",
      }
  }
}

export function StateMessageCard({
  variant = "info",
  title,
  description,
  className = "",
}: {
  variant?: StateVariant
  title: string
  description?: string
  className?: string
}) {
  const tone = toneForVariant(variant)
  const Icon = tone.icon

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone.wrapper} ${className}`}>
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className="mt-0.5 text-xs text-current/80">{description}</p>}
        </div>
      </div>
    </div>
  )
}
