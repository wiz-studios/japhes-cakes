const CAKE_PRICE_TABLE: Record<string, Record<string, number>> = {
  Vanilla: {
    "0.5kg": 1000, "1kg": 1500, "1.5kg": 2300, "2kg": 2800, "2.5kg": 3300,
    "3kg": 4300, "3.5kg": 5300, "4kg": 6000, "4.5kg": 6700, "5kg": 7500,
  },
  Carrot: {
    "0.5kg": 1000, "1kg": 1500, "1.5kg": 2300, "2kg": 2800, "2.5kg": 3300,
    "3kg": 4300, "3.5kg": 5300, "4kg": 6000, "4.5kg": 6700, "5kg": 7500,
  },
  Marble: {
    "0.5kg": 1000, "1kg": 1600, "1.5kg": 2400, "2kg": 2900, "2.5kg": 3500,
    "3kg": 4400, "3.5kg": 5300, "4kg": 6000, "4.5kg": 6700, "5kg": 7500,
  },
  Strawberry: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  Blueberry: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  Chocolate: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  Banana: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  Mint: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  Mango: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  Orange: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  Passion: {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  "Lemon Velvet": {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  "Red Velvet": {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  "Black Forest": {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  "White Forest": {
    "0.5kg": 1200, "1kg": 1800, "1.5kg": 2800, "2kg": 3400, "2.5kg": 4200,
    "3kg": 4800, "3.5kg": 5500, "4kg": 6400, "4.5kg": 7200, "5kg": 7800,
  },
  "Fruit Cake": {
    "0.5kg": 1500, "1kg": 2600, "1.5kg": 3300, "2kg": 4000, "2.5kg": 4600,
    "3kg": 5000, "3.5kg": 5800, "4kg": 6600, "4.5kg": 7500, "5kg": 7800,
  },
}

export const CAKE_SIZES = [
  "0.5kg", "1kg", "1.5kg", "2kg", "2.5kg", "3kg", "3.5kg", "4kg", "4.5kg", "5kg",
] as const

export const CAKE_FLAVORS = [
  "Vanilla",
  "Carrot",
  "Marble",
  "Strawberry",
  "Blueberry",
  "Chocolate",
  "Banana",
  "Mint",
  "Mango",
  "Orange",
  "Passion",
  "Lemon Velvet",
  "Red Velvet",
  "Black Forest",
  "White Forest",
  "Fruit Cake",
] as const

const normalize = (value: string) => value.trim().toLowerCase()

const FLAVOR_KEY_MAP = Object.keys(CAKE_PRICE_TABLE).reduce((acc, flavor) => {
  acc[normalize(flavor)] = flavor
  return acc
}, {} as Record<string, string>)

const SIZE_KEY_MAP = CAKE_SIZES.reduce((acc, size) => {
  acc[normalize(size)] = size
  return acc
}, {} as Record<string, string>)

export function getCakePrice(flavor: string, size: string): number {
  const flavorKey = FLAVOR_KEY_MAP[normalize(flavor)] || "Vanilla"
  const sizeKey = SIZE_KEY_MAP[normalize(size)] || "1kg"
  return CAKE_PRICE_TABLE[flavorKey][sizeKey]
}

export function getCakeDisplayName(flavor: string): string {
  const flavorKey = FLAVOR_KEY_MAP[normalize(flavor)] || flavor
  if (normalize(flavorKey).includes("cake")) return flavorKey
  return `${flavorKey} Cake`
}
