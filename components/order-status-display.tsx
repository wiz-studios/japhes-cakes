import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Clock, Truck, PackageCheck, UtensilsCrossed } from "lucide-react"
import { formatDateNairobi } from "@/lib/time"

const statusConfig: Record<string, { label: string; icon: any; progress: number; color: string }> = {
  order_received: { label: "Order Received", icon: Clock, progress: 30, color: "text-blue-500" },
  in_kitchen: { label: "In Kitchen", icon: UtensilsCrossed, progress: 50, color: "text-orange-500" },
  ready_for_pickup: { label: "Ready for Pickup", icon: PackageCheck, progress: 75, color: "text-green-500" },
  out_for_delivery: { label: "Out for Delivery", icon: Truck, progress: 85, color: "text-purple-500" },
  delivered: { label: "Delivered", icon: CheckCircle2, progress: 100, color: "text-green-600" },
  collected: { label: "Collected", icon: CheckCircle2, progress: 100, color: "text-green-600" },
  cancelled: { label: "Cancelled", icon: Clock, progress: 0, color: "text-red-500" },
}

export function OrderStatusDisplay({ order }: { order: any }) {
  const config = statusConfig[order.status] || statusConfig["order_received"]
  const StatusIcon = config.icon

  return (
    <div className="space-y-6">
      <div className="lux-card p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs text-muted-foreground uppercase font-bold tracking-[0.28em]">Status</h3>
            <div className={`text-2xl font-semibold flex items-center gap-2 mt-2 ${config.color}`}>
              <StatusIcon size={24} /> {config.label}
            </div>
          </div>
          <Badge variant={order.payment_status === "paid" ? "default" : "outline"} className="mt-1">
            Payment: {order.payment_status.toUpperCase()}
          </Badge>
        </div>

        <Progress value={config.progress} className="h-3" />

        <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-white/60">
          <div>
            <span className="text-muted-foreground block">Order Type</span>
            <span className="font-medium capitalize">{order.order_type}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Fulfilment</span>
            <span className="font-medium capitalize">{order.fulfilment}</span>
          </div>
          {order.preferred_date && (
            <div>
              <span className="text-muted-foreground block">Preferred Date</span>
              <span className="font-medium">{formatDateNairobi(order.preferred_date, { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground block">Delivery Window</span>
            <span className="font-medium">{order.delivery_window || "Standard"}</span>
          </div>
        </div>
      </div>

      <div className="lux-card p-6">
        <h4 className="font-semibold mb-4 font-serif">Items</h4>
        <div className="space-y-4">
          {order.order_items.map((item: any) => (
            <div key={item.id} className="flex justify-between items-start text-sm">
              <div>
                <p className="font-bold">
                  {item.quantity}x {item.item_name}
                </p>
                {item.notes && <p className="text-muted-foreground text-xs mt-1">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
