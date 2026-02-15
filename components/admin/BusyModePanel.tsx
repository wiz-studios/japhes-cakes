"use client"

import { useState, useTransition } from "react"
import { AlertTriangle, Clock3, PauseCircle, Save } from "lucide-react"
import { updateBusyModeSettings } from "@/app/actions/store-settings"
import type { StoreSettings } from "@/lib/store-settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function BusyModePanel({ initial }: { initial: StoreSettings }) {
  const [isPending, startTransition] = useTransition()
  const [enabled, setEnabled] = useState(initial.busyModeEnabled)
  const [action, setAction] = useState<"disable_orders" | "increase_eta">(initial.busyModeAction)
  const [extraMinutes, setExtraMinutes] = useState(initial.busyModeExtraMinutes)
  const [message, setMessage] = useState(initial.busyModeMessage)
  const [feedback, setFeedback] = useState<string>("")
  const [error, setError] = useState<string>("")

  function onSave() {
    setFeedback("")
    setError("")
    startTransition(async () => {
      const result = await updateBusyModeSettings({
        busyModeEnabled: enabled,
        busyModeAction: action,
        busyModeExtraMinutes: extraMinutes,
        busyModeMessage: message,
      })

      if (!result.success) {
        setError(result.error || "Failed to update busy mode.")
        return
      }
      setFeedback("Busy mode settings saved.")
    })
  }

  return (
    <Card className="border-white/60 bg-white/90 shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)] backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Busy Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <Label htmlFor="busy-mode-switch" className="text-sm font-semibold text-slate-900">
              We are overloaded
            </Label>
            <p className="text-xs text-slate-500">Turn this on when the kitchen needs a controlled intake.</p>
          </div>
          <Switch id="busy-mode-switch" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <fieldset disabled={!enabled} className="space-y-3 disabled:opacity-60">
          <div className="grid gap-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500">When busy mode is enabled</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAction("disable_orders")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  action === "disable_orders"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <PauseCircle className="h-4 w-4" />
                  Disable new orders
                </div>
                <p className="mt-1 text-xs opacity-80">Stops checkout submissions until switched off.</p>
              </button>
              <button
                type="button"
                onClick={() => setAction("increase_eta")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  action === "increase_eta"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Clock3 className="h-4 w-4" />
                  Increase prep/delivery ETA
                </div>
                <p className="mt-1 text-xs opacity-80">Keeps orders open and adjusts expected timing.</p>
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
            <Label htmlFor="busy-extra-mins" className="text-sm">
              Extra minutes
            </Label>
            <Input
              id="busy-extra-mins"
              type="number"
              min={0}
              max={180}
              value={extraMinutes}
              onChange={(e) => setExtraMinutes(Number(e.target.value || 0))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="busy-message" className="text-sm">
              Customer message
            </Label>
            <Input
              id="busy-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={180}
              placeholder="We are currently overloaded. Please try again shortly."
            />
          </div>
        </fieldset>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {feedback && <p className="text-xs font-medium text-emerald-600">{feedback}</p>}

        <Button type="button" onClick={onSave} disabled={isPending} className="w-full sm:w-auto gap-2">
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save Busy Mode"}
        </Button>
      </CardContent>
    </Card>
  )
}
