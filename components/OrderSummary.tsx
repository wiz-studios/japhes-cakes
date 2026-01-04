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
  // Add other properties as needed
}

interface OrderSummaryProps {
  order: Order;
  onConfirm: () => void;
}

// OrderSummary: shows order details, price, and late-night warning
// Fixed TypeScript errors by adding explicit types for props and map parameter
export default function OrderSummary({ order }: { order: Order }) {
  const isLateNight = order.placedHour >= 21;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl p-8 mt-8"
    >
      <h2 className="text-2xl font-bold mb-6 text-rose-600">Order Summary</h2>
      <div className="mb-4">
        <div className="flex justify-between">
          <span className="font-semibold">Items:</span>
          <span>{order.items.map((i: OrderItem) => i.name).join(", ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Delivery Fee:</span>
          <span>{order.deliveryFee} KES</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Total:</span>
          <span className="font-bold text-amber-600">{order.total} KES</span>
        </div>
        {isLateNight && (
          <div className="mt-2 text-amber-600 font-medium">
            Orders placed after 9 PM will be scheduled for the next day.
          </div>
        )}
      </div>
    </motion.div>
  );
}
