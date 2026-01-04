"use client"

import { motion } from "framer-motion";

// StatusProgressBar: animated order status tracker
const statusSteps = [
  { key: "order_received", label: "Received" },
  { key: "in_kitchen", label: "In Kitchen" },
  { key: "ready_for_pickup", label: "Ready" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

export default function StatusProgressBar({ status }: { status: string }) {
  const currentStep = statusSteps.findIndex(s => s.key === status);

  return (
    <div className="flex items-center gap-2 mt-8">
      {statusSteps.map((step, idx) => (
        <div key={step.key} className="flex-1 flex flex-col items-center">
          <motion.div
            animate={{
              backgroundColor: idx <= currentStep ? "#f59e42" : "#e5e7eb",
              scale: idx === currentStep ? 1.2 : 1,
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg"
            transition={{ type: "spring", stiffness: 300 }}
          >
            {idx + 1}
          </motion.div>
          <span className={`mt-2 text-xs font-semibold ${idx <= currentStep ? "text-amber-600" : "text-gray-400"}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
