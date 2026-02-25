type MaybeNumeric = number | string | null | undefined

function toSafeNumber(value: MaybeNumeric): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

export function computeBalance(order: {
  total_amount?: MaybeNumeric
  payment_amount_paid?: MaybeNumeric
  payment_amount_due?: MaybeNumeric
}) {
  const totalAmount = Math.max(toSafeNumber(order.total_amount), 0)
  const amountPaid = Math.max(toSafeNumber(order.payment_amount_paid), 0)
  const computedDue = Math.max(totalAmount - amountPaid, 0)
  const storedDue = Math.max(toSafeNumber(order.payment_amount_due), 0)

  // Prefer computed due to avoid stale values while preserving non-negative bounds.
  const balanceDue = Math.max(computedDue, 0)

  return {
    totalAmount,
    amountPaid,
    balanceDue,
    storedDue,
  }
}
