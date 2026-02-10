"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, Search, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatFriendlyId } from "@/lib/order-helpers"

interface Order {
  id: string
  created_at: string
  customer_name: string
  status: string
  payment_status: string
  total: number
  order_type: "cake" | "pizza"
  fulfilment: string
  [key: string]: any
}

// Status Color Map
const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  order_received: "warning", // Yellow
  in_kitchen: "info",        // Blue
  preparing: "info",
  ready_for_pickup: "secondary", // Purple/Gray
  out_for_delivery: "secondary",
  delivered: "success",      // Green
  collected: "success",
  cancelled: "destructive",  // Red
  completed: "success"
}

// Helper for custom badge styles since Shadcn badge variants might be limited default
const getBadgeStyle = (status: string) => {
  switch (status) {
    case 'order_received': return "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"
    case 'in_kitchen':
    case 'preparing': return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
    case 'ready_for_pickup':
    case 'out_for_delivery': return "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
    case 'delivered':
    case 'collected':
    case 'completed': return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
    case 'cancelled': return "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
    default: return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

export default function AdminOrderTable({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const filtered = orders.filter((o: Order) => {
    const term = search.toLowerCase()
    const friendlyId = formatFriendlyId(o).toLowerCase()
    return (
      o.customer_name?.toLowerCase().includes(term) ||
      friendlyId.includes(term) ||
      o.id.toLowerCase().includes(term)
    )
  })

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedOrders = filtered.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/90 p-4 rounded-2xl shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)] border border-white/60 backdrop-blur">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID (e.g. C2025...)"
            className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" /> Date
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white/90 rounded-2xl shadow-[0_20px_60px_-50px_rgba(15,20,40,0.5)] border border-white/60 overflow-hidden backdrop-blur">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[720px] md:min-w-full">
          <TableHeader className="bg-white/70">
            <TableRow>
              <TableHead className="w-[180px]">Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell">Payment</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden sm:table-cell">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="group hover:bg-white/60 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/order/${order.id}`)}
                >
                  <TableCell className="font-mono font-medium text-gray-700 group-hover:text-gray-900">
                    {formatFriendlyId(order)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(order.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{order.customer_name || "Guest"}</span>
                      <span className="text-xs text-muted-foreground font-normal">{order.fulfilment}</span>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground sm:hidden">
                        <Badge variant="outline" className={order.order_type === 'cake' ? "border-rose-200 text-rose-700 bg-rose-50" : "border-orange-200 text-orange-700 bg-orange-50"}>
                          {order.order_type === 'cake' ? "Cake" : "Pizza"}
                        </Badge>
                        <Badge className={`uppercase text-[10px] tracking-wider font-bold shadow-none border ${getBadgeStyle(order.status)} border`}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge className={`uppercase text-[10px] tracking-wider font-bold shadow-none border ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          order.payment_status === 'deposit_paid' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            order.payment_status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {order.payment_status?.replace(/_/g, " ") || "unknown"}
                        </Badge>
                        <span className="font-semibold text-slate-700">{(order.total_amount || 0).toLocaleString()} KES</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className={order.order_type === 'cake' ? "border-rose-200 text-rose-700 bg-rose-50" : "border-orange-200 text-orange-700 bg-orange-50"}>
                      {order.order_type === 'cake' ? "Cake" : "Pizza"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {/* Payment Status */}
                    <div className="flex flex-col gap-1">
                        <Badge className={`uppercase text-[10px] tracking-wider font-bold shadow-none border ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          order.payment_status === 'deposit_paid' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            order.payment_status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                        {order.payment_status?.replace(/_/g, " ") || "unknown"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {order.payment_method === 'mpesa' ? 'M-Pesa' : 'Cash'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge className={`uppercase text-[10px] tracking-wider font-bold shadow-none ${getBadgeStyle(order.status)} border`}>
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-medium text-gray-900">
                    {(order.total_amount || 0).toLocaleString()} KES
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        router.push(`/admin/order/${order.id}`)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>


      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                // Show first page, current page and neighbors, last page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
