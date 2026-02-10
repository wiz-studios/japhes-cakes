export const PIZZA_BASE_PRICES: Record<string, number> = {
  Small: 650,
  Medium: 850,
  Large: 1150,
}

export const PIZZA_TYPE_PRICES: Record<string, Record<string, number>> = {
  Margherita: { Small: 650, Medium: 850, Large: 1150 },
  Vegetarian: { Small: 650, Medium: 850, Large: 1150 },
  "Beef Supreme": { Small: 650, Medium: 850, Large: 1150 },
  Hawaiian: { Small: 650, Medium: 850, Large: 1150 },
  "Meat Deluxe": { Small: 700, Medium: 900, Large: 1200 },
  "BBQ Steak": { Small: 650, Medium: 850, Large: 1150 },
  "BBQ Chicken": { Small: 650, Medium: 850, Large: 1150 },
  "Chicken Periperi": { Small: 650, Medium: 850, Large: 1150 },
  "Chicken Tikka": { Small: 650, Medium: 850, Large: 1150 },
  "Chicken Supreme": { Small: 650, Medium: 850, Large: 1150 },
  "Chicken Macon": { Small: 700, Medium: 900, Large: 1200 },
}

export function getPizzaUnitPrice(
  size: string,
  type: string,
  toppingsCount: number = 0
): number {
  const typePrice = PIZZA_TYPE_PRICES[type]?.[size]
  const basePrice = PIZZA_BASE_PRICES[size] ?? PIZZA_BASE_PRICES.Medium
  const toppingsTotal = Math.max(0, toppingsCount) * 100
  return (typePrice ?? basePrice) + toppingsTotal
}
