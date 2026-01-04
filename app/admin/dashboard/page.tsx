import { createServerSupabaseClient } from "@/lib/supabase-server"

import dynamic from "next/dynamic"
const AdminOrderTable = dynamic(() => import("@/components/AdminOrderTable"))

// Define type for order to fix TypeScript implicit any error
interface Order {
  id: string;
  status: string;
  // Add other fields as needed based on your schema
  [key: string]: any; // For flexibility with Supabase select *
}

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: orders } = await supabase
    .from("orders")
    .select("*, delivery_zones(name)")
    .order("created_at", { ascending: false })

  // Exclude cancelled orders from active list
  const activeOrders = orders?.filter((order: Order) => order.status !== "cancelled")

  return <AdminOrderTable orders={activeOrders || []} />
}
