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
    <div className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="order-id">Order Number</Label>
        <Input
          id="order-id"
          placeholder="e.g. C9CZA42"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <Button className="w-full h-12 rounded-xl mt-2" onClick={handleSearch} disabled={!id.trim() && !phone.trim()}>
        <Search className="mr-2" size={18} /> Find My Order
      </Button>
    </div>
  )
}
