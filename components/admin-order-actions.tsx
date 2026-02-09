"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { updateOrderStatus, markOrderAsPaid } from "@/app/actions/orders"
import { CheckCircle2 } from "lucide-react"

export function AdminOrderActions({
  orderId,
  currentStatus,
  currentPayment,
  orderType,
  fulfilment,
  totalAmount,
  depositAmount,
}: {
  orderId: string
  currentStatus: string
  currentPayment: string
  orderType: string
  fulfilment: string
  totalAmount: number
  depositAmount?: number | null
}) {
  const [status, setStatus] = useState(currentStatus)
  const [payment, setPayment] = useState(currentPayment)
  const [loading, setLoading] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const router = useRouter()

  const handleUpdate = async () => {
    setLoading(true)

    // Status update via server action
    if (status !== currentStatus) {
      const result = await updateOrderStatus(orderId, status)
      if (!result.success) {
        alert(result.error)
        setLoading(false)
        return
      }
    }

    // Payment status update (direct allowed)
    if (payment !== currentPayment) {
      const supabase = createClient()
      const paymentUpdate: any = { payment_status: payment }
      if (payment === "paid") {
        paymentUpdate.payment_amount_paid = totalAmount
        paymentUpdate.payment_amount_due = 0
      } else if (payment === "deposit_paid") {
        const deposit = depositAmount ?? Math.ceil(totalAmount * 0.5)
        paymentUpdate.payment_amount_paid = deposit
        paymentUpdate.payment_amount_due = Math.max(totalAmount - deposit, 0)
      }
      await supabase.from("orders").update(paymentUpdate).eq("id", orderId)
    }

    router.refresh()
    alert("Order updated successfully")
    setLoading(false)
  }

  const pickupStates = ["order_received", "in_kitchen", "ready_for_pickup", "delivered"]
  const deliveryStates = ["order_received", "in_kitchen", "out_for_delivery", "delivered"]
  const availableStates = fulfilment === "pickup" ? pickupStates : deliveryStates

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Order Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableStates.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Payment Status</Label>
        <Select value={payment} onValueChange={setPayment}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button className="w-full" onClick={handleUpdate} disabled={loading}>
        Update Order
      </Button>

      {/* Mark as Paid Button (for pending M-Pesa orders) */}
      {currentPayment === "pending" && (
        <div className="pt-4 border-t space-y-3">
          <Label>M-Pesa Transaction ID (Optional)</Label>
          <Input
            placeholder="ABC123XYZ"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
          <Button
            variant="default"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={async () => {
              if (confirm("Mark this order as paid?")) {
                setLoading(true)
                const result = await markOrderAsPaid(orderId, transactionId || undefined)
                if (result.success) {
                  router.refresh()
                  alert("Order marked as paid")
                } else {
                  alert(result.error || "Failed to update payment")
                }
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Paid
          </Button>
        </div>
      )}

      <div className="pt-4 border-t">
        <Button
          variant="destructive"
          className="w-full"
          onClick={async () => {
            if (confirm("Cancel this order?")) {
              await updateOrderStatus(orderId, "cancelled")
              router.refresh()
            }
          }}
        >
          Cancel Order
        </Button>
      </div>
    </div>
  )
}
