export const PIZZA_BASE_PRICES: Record<string, number> = {
  "Pizza Pie": 350,
  Small: 650,
  Medium: 850,
  Large: 1150,
}

export const PIZZA_TYPE_PRICES: Record<string, Record<string, number>> = {
  Margherita: { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  Vegetarian: { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  "Beef Supreme": { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  Hawaiian: { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  "Meat Deluxe": { "Pizza Pie": 350, Small: 700, Medium: 900, Large: 1200 },
  "BBQ Steak": { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  "BBQ Chicken": { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  "Chicken Periperi": { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  "Chicken Tikka": { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  "Chicken Supreme": { "Pizza Pie": 350, Small: 650, Medium: 850, Large: 1150 },
  "Chicken Macon": { "Pizza Pie": 350, Small: 700, Medium: 900, Large: 1200 },
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
