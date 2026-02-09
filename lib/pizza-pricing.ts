export const PIZZA_BASE_PRICES: Record<string, number> = {
  Small: 700,
  Medium: 1000,
  Large: 1500,
}

export const PIZZA_TYPE_SURCHARGES: Record<string, number> = {
  Margherita: 0,
  Vegetarian: 0,
  "BBQ Chicken": 200,
  "Chicken Periperi": 200,
  "Beef & Onion": 200,
  "Everything Meat": 300,
  Hawaiian: 150,
  Boerewors: 250,
  "Chicken Mushroom": 200,
}

export function getPizzaUnitPrice(
  size: string,
  type: string,
  toppingsCount: number = 0
): number {
  const basePrice = PIZZA_BASE_PRICES[size] ?? PIZZA_BASE_PRICES.Medium
  const typeSurcharge = PIZZA_TYPE_SURCHARGES[type] ?? 0
  const toppingsTotal = Math.max(0, toppingsCount) * 100
  return basePrice + typeSurcharge + toppingsTotal
}
