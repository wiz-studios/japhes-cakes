"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { updateOrderStatus, markOrderAsPaid } from "@/app/actions/orders"
import { toKenyaMsisdn } from "@/lib/phone"
import { CheckCircle2, MessageCircle } from "lucide-react"

const TEMPLATE_DEFAULTS = {
  orderReady: "Hi {name}, your {orderType} order is ready for pickup at {time}. Thank you for choosing Japhe's Cakes & Pizza.",
  classReminder: "Hi {name}, friendly reminder: your Japhe's School of Cake class is {day}. See you in class!",
  pickupReady: "Hi {name}, your order is packed and pickup-ready. You can collect it at {time}.",
}

export function AdminOrderActions({
  orderId,
  currentStatus,
  currentPayment,
  orderType,
  fulfilment,
  totalAmount,
  depositAmount,
  customerName,
  customerPhone,
}: {
  orderId: string
  currentStatus: string
  currentPayment: string
  orderType: string
  fulfilment: string
  totalAmount: number
  depositAmount?: number | null
  customerName: string
  customerPhone: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [payment, setPayment] = useState(currentPayment)
  const [loading, setLoading] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [readyTime, setReadyTime] = useState("3:00 PM")
  const [classReminderDay, setClassReminderDay] = useState("tomorrow")
  const [orderReadyTemplate, setOrderReadyTemplate] = useState(TEMPLATE_DEFAULTS.orderReady)
  const [classReminderTemplate, setClassReminderTemplate] = useState(TEMPLATE_DEFAULTS.classReminder)
  const [pickupReadyTemplate, setPickupReadyTemplate] = useState(TEMPLATE_DEFAULTS.pickupReady)

  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem("admin.whatsapp.templates")
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as Partial<typeof TEMPLATE_DEFAULTS>
      if (parsed.orderReady) setOrderReadyTemplate(parsed.orderReady)
      if (parsed.classReminder) setClassReminderTemplate(parsed.classReminder)
      if (parsed.pickupReady) setPickupReadyTemplate(parsed.pickupReady)
    } catch {
      // ignore bad localStorage payload
    }
  }, [])

  const saveTemplates = () => {
    localStorage.setItem(
      "admin.whatsapp.templates",
      JSON.stringify({
        orderReady: orderReadyTemplate,
        classReminder: classReminderTemplate,
        pickupReady: pickupReadyTemplate,
      })
    )
    alert("WhatsApp templates saved")
  }

  const phoneForWhatsApp = useMemo(() => toKenyaMsisdn(customerPhone), [customerPhone])

  const applyTemplate = (template: string, payload: { name: string; orderType: string; time: string; day: string }) =>
    template
      .replaceAll("{name}", payload.name)
      .replaceAll("{orderType}", payload.orderType)
      .replaceAll("{time}", payload.time)
      .replaceAll("{day}", payload.day)

  const orderReadyMessage = applyTemplate(orderReadyTemplate, {
    name: customerName,
    orderType,
    time: readyTime,
    day: classReminderDay,
  })

  const classReminderMessage = applyTemplate(classReminderTemplate, {
    name: customerName,
    orderType,
    time: readyTime,
    day: classReminderDay,
  })

  const pickupReadyMessage = applyTemplate(pickupReadyTemplate, {
    name: customerName,
    orderType,
    time: readyTime,
    day: classReminderDay,
  })

  const openWhatsApp = async (message: string, eventType: string) => {
    if (!phoneForWhatsApp) {
      alert("Customer phone number is missing or invalid. Use 07/01 or +254 format.")
      return
    }

    await fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        orderId,
        customerPhone,
        at: new Date().toISOString(),
      }),
    })

    window.open(`https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(message)}`, "_blank")
  }

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

      if (status === "ready_for_pickup") {
        const shouldSend = confirm("Open WhatsApp 'order ready' message now?")
        if (shouldSend) {
          await openWhatsApp(orderReadyMessage, "status_auto_ready_for_pickup")
        }
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
      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "payment_update", orderId, payment, at: new Date().toISOString() }),
      })
    }

    router.refresh()
    alert("Order updated successfully")
    setLoading(false)
  }

  const pickupStates = ["order_received", "ready_for_pickup", "collected"]
  const deliveryStates = ["order_received", "ready_for_pickup", "delivered"]
  const baseStates = fulfilment === "pickup" ? pickupStates : deliveryStates
  const availableStates =
    currentStatus && !baseStates.includes(currentStatus) && currentStatus !== "cancelled"
      ? [currentStatus, ...baseStates]
      : baseStates



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

      <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <Label>WhatsApp Automation</Label>
          <Button variant="outline" size="sm" onClick={saveTemplates}>Save templates</Button>
        </div>
        <Input value={readyTime} onChange={(e) => setReadyTime(e.target.value)} placeholder="Pickup time (e.g. 3:00 PM)" />
        <Input
          value={classReminderDay}
          onChange={(e) => setClassReminderDay(e.target.value)}
          placeholder="Class reminder timing (e.g. tomorrow at 9 AM)"
        />
        <Input value={orderReadyTemplate} onChange={(e) => setOrderReadyTemplate(e.target.value)} placeholder="Order ready template" />
        <Input value={classReminderTemplate} onChange={(e) => setClassReminderTemplate(e.target.value)} placeholder="Class reminder template" />
        <Input value={pickupReadyTemplate} onChange={(e) => setPickupReadyTemplate(e.target.value)} placeholder="Pickup ready template" />

        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" onClick={() => openWhatsApp(orderReadyMessage, "manual_order_ready") }>
            <MessageCircle className="mr-2 h-4 w-4" />
            Send order ready message
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => openWhatsApp(classReminderMessage, "manual_class_reminder") }>
            <MessageCircle className="mr-2 h-4 w-4" />
            Send class reminder
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => openWhatsApp(pickupReadyMessage, "manual_pickup_ready") }>
            <MessageCircle className="mr-2 h-4 w-4" />
            Send pickup ready
          </Button>
        </div>
      </div>

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
              await fetch("/api/admin/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventType: "order_cancelled", orderId, at: new Date().toISOString() }),
              })
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
