"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, Search } from "lucide-react"
import { normalizeKenyaPhone } from "@/lib/phone"

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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.25)] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Order Lookup</p>
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
            className="bg-slate-50 border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(normalizeKenyaPhone(e.target.value))}
            inputMode="numeric"
            maxLength={10}
            pattern="^(07|01)\\d{8}$"
            className="bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          If you enter both, we will match the exact order linked to that phone number.
        </p>
        <Button
          className="w-full md:w-auto h-11 px-7 rounded-full bg-slate-900 text-white hover:bg-slate-800"
          onClick={handleSearch}
          disabled={!id.trim() && !phone.trim()}
        >
          <Search className="mr-2" size={18} /> Find My Order
        </Button>
      </div>
    </div>
  )
}
