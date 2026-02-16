import type React from "react"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AdminOrderActions } from "@/components/admin-order-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*), delivery_zones(*)")
    .eq("id", id)
    .single()

  if (!order) notFound()

  const { data: paymentAttempts } = await supabase
    .from("payment_attempts")
    .select("id, mpesa_receipt, amount, result_code, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true })

  const successfulAttempts = (paymentAttempts || []).filter(
    (attempt: any) => attempt.result_code === 0 && attempt.mpesa_receipt
  )

  const communicationTimeline = [
    { label: "Order placed", at: order.created_at },
    ...(order.status ? [{ label: `Status: ${String(order.status).replace(/_/g, " ")}`, at: order.updated_at || order.created_at }] : []),
    ...(order.payment_status ? [{ label: `Payment: ${String(order.payment_status).replace(/_/g, " ")}`, at: order.updated_at || order.created_at }] : []),
  ]

  return (
    <div className="max-w-none space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">Order Details</h2>
        <Badge variant="outline" className="font-mono">
          {order.friendly_id || order.id}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer & Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <div className="font-bold text-lg">{order.customer_name}</div>
                <div className="text-primary font-medium">{order.phone}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Fulfilment</Label>
                <div className="font-bold capitalize">
                  {order.fulfilment} ({order.delivery_zones?.name || "Pickup"})
                </div>
                <div className="text-sm">{order.delivery_window}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-2">Order Items</h4>
              {order.order_items.map((item: any) => (
                <div key={item.id} className="bg-muted/30 p-4 rounded-xl mb-2">
                  <div className="flex justify-between font-bold">
                    <span>
                      {item.quantity}x {item.item_name}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground/80">Notes:</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-2">M-Pesa Transaction IDs</h4>
              {successfulAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transaction IDs recorded yet.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {successfulAttempts.map((attempt: any, index: number) => (
                    <div key={attempt.id || `${attempt.mpesa_receipt}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Payment {index + 1}</span>
                      <span className="font-mono text-primary">{attempt.mpesa_receipt}</span>
                      {typeof attempt.amount === "number" && (
                        <span className="font-semibold">{attempt.amount.toLocaleString()} KES</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button asChild variant="outline" className="w-full"><Link href={`/admin/order/${order.id}`}>Open Printable Receipt View</Link></Button>
            <div className="rounded-xl border p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Communication Timeline</p>
              <div className="mt-2 space-y-2">
                {communicationTimeline.map((event, idx) => (
                  <div key={`${event.label}-${idx}`} className="text-sm">
                    <p className="font-medium text-slate-800">{event.label}</p>
                    <p className="text-xs text-slate-500">{new Date(event.at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <AdminOrderActions
              orderId={order.id}
              currentStatus={order.status}
              currentPayment={order.payment_status}
              orderType={order.order_type}
              fulfilment={order.fulfilment}
              totalAmount={order.total_amount || 0}
              depositAmount={order.payment_deposit_amount}
              customerName={order.customer_name || "Customer"}
              customerPhone={order.phone || ""}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-xs uppercase tracking-wider font-bold block ${className}`}>{children}</span>
}
