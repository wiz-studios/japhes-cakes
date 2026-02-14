import type React from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { AdminOrderActions } from "@/components/admin-order-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

  return (
    <div className="max-w-none space-y-6">
      <div className="flex items-center gap-4">
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
                  {item.notes && <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap">{item.notes}</p>}
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
            <AdminOrderActions
              orderId={order.id}
              currentStatus={order.status}
              currentPayment={order.payment_status}
              orderType={order.order_type}
              fulfilment={order.fulfilment}
              totalAmount={order.total_amount || 0}
              depositAmount={order.payment_deposit_amount}
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
