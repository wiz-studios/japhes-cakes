"use client"

import { motion } from "framer-motion";

// Define types for the order and item to fix TypeScript implicit any errors
interface OrderItem {
  name: string;
  // Add other properties as needed, e.g., price, quantity
}

interface Order {
  items: OrderItem[];
  deliveryFee: number;
  total: number;
  placedHour: number;
  fulfilment?: string;
  // Add other properties as needed
}

interface OrderSummaryProps {
  order: Order;
  paymentPlan?: "full" | "deposit";
  depositAmount?: number;
  discountAmount?: number;
}

// OrderSummary: shows order details, price, and late-night warning
// Fixed TypeScript errors by adding explicit types for props and map parameter
export default function OrderSummary({ order, paymentPlan = "full", depositAmount, discountAmount }: OrderSummaryProps) {
  const isLateNight = order.placedHour >= 21;
  const depositDue = depositAmount ?? Math.ceil(order.total * 0.5)
  const itemNames = order.items.map((i: OrderItem) => i.name).join(", ")
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-8 max-w-lg lux-card p-5 sm:p-6 md:p-8"
    >
      <h2 className="mb-6 text-2xl font-semibold text-[var(--brand-magenta-deep)] font-serif">Order Summary</h2>
      <div className="mb-4 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Items</span>
          <p className="mt-2 break-words text-sm font-medium text-slate-800">{itemNames}</p>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold">Delivery Fee</span>
          <span className="font-medium text-slate-800">{order.deliveryFee} KES</span>
        </div>
        {typeof discountAmount === "number" && discountAmount > 0 && (
          <div className="flex flex-col gap-1 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold text-emerald-800">Offer Savings</span>
            <span className="font-bold text-emerald-700">- {discountAmount} KES</span>
          </div>
        )}
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-amber-600">{order.total} KES</span>
        </div>
        {paymentPlan === "deposit" && (
          <>
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">Deposit Due Now</span>
              <span className="font-bold text-emerald-700">{depositDue} KES</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">Balance on {order.fulfilment === "delivery" ? "Delivery" : "Pickup"}</span>
              <span className="font-bold text-slate-700">{(order.total - depositDue)} KES</span>
            </div>
          </>
        )}
        {isLateNight && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-700">
            Orders placed after 9 PM will be scheduled for the next day.
          </div>
        )}
      </div>
    </motion.div>
  );
}
