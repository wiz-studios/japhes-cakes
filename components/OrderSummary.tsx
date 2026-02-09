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
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto lux-card p-8 mt-8"
    >
      <h2 className="text-2xl font-semibold mb-6 text-[var(--brand-magenta-deep)] font-serif">Order Summary</h2>
      <div className="mb-4">
        <div className="flex justify-between">
          <span className="font-semibold">Items:</span>
          <span>{order.items.map((i: OrderItem) => i.name).join(", ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Delivery Fee:</span>
          <span>{order.deliveryFee} KES</span>
        </div>
        {typeof discountAmount === "number" && discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="font-semibold">Offer Savings:</span>
            <span className="font-bold text-emerald-700">- {discountAmount} KES</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="font-semibold">Total:</span>
          <span className="font-bold text-amber-600">{order.total} KES</span>
        </div>
        {paymentPlan === "deposit" && (
          <>
            <div className="flex justify-between">
              <span className="font-semibold">Deposit Due Now:</span>
              <span className="font-bold text-emerald-700">{depositDue} KES</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Balance on {order.fulfilment === "delivery" ? "Delivery" : "Pickup"}:</span>
              <span className="font-bold text-slate-700">{(order.total - depositDue)} KES</span>
            </div>
          </>
        )}
        {isLateNight && (
          <div className="mt-2 text-amber-600 font-medium">
            Orders placed after 9 PM will be scheduled for the next day.
          </div>
        )}
      </div>
    </motion.div>
  );
}
