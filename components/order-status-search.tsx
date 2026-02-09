"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, Search } from "lucide-react"

export function OrderStatusSearch({
  initialId = "",
  initialPhone = "",
  error,
}: { initialId?: string; initialPhone?: string; error?: string | null }) {
  const [id, setId] = useState(initialId)
  const [phone, setPhone] = useState(initialPhone)
  const router = useRouter()

  const handleSearch = () => {
    const trimmedId = id.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedId && !trimmedPhone) return

    const query = new URLSearchParams()
    if (trimmedId) query.set("id", trimmedId)
    if (trimmedPhone) query.set("phone", trimmedPhone)
    router.push(`/status?${query.toString()}`)
  }

  return (
    <div className="lux-card p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Order Lookup</p>
          <h3 className="text-lg font-semibold text-slate-900">Find your order</h3>
        </div>
        <div className="text-xs text-slate-500">Use order number or phone.</div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="order-id">Order Number</Label>
          <Input
            id="order-id"
            placeholder="e.g. C9CZA42"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="lux-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="lux-input"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          If you enter both, we will match the exact order linked to that phone number.
        </p>
        <Button
          className="w-full md:w-auto h-12 px-8 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 text-white shadow-[0_18px_40px_-24px_rgba(88,56,170,0.7)] hover:opacity-90"
          onClick={handleSearch}
          disabled={!id.trim() && !phone.trim()}
        >
          <Search className="mr-2" size={18} /> Find My Order
        </Button>
      </div>
    </div>
  )
}
