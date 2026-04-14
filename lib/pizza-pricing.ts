export type PizzaSideCategory = "pizza" | "burger" | "juice" | "mocktail"

type MenuSizeOption = {
  value: string
  label: string
  meta: string
}

type MenuItemDefinition = {
  name: string
  description: string
  prices: Record<string, number>
}

export const MENU_CATEGORY_LABELS: Record<PizzaSideCategory, string> = {
  pizza: "Pizza",
  burger: "Burger",
  juice: "Juice",
  mocktail: "Mocktail",
}

export const PIZZA_BASE_PRICES: Record<string, number> = {
  Test: 10,
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

const MENU_SIZE_OPTIONS: Record<PizzaSideCategory, MenuSizeOption[]> = {
  pizza: [
    { value: "Test", label: "Test Item", meta: "Ksh 10 (STK test)" },
    { value: "Pizza Pie", label: "Pizza Pie", meta: "Ksh 350" },
    { value: "Small", label: "Small", meta: "Personal" },
    { value: "Medium", label: "Medium", meta: "2-3 people" },
    { value: "Large", label: "Large", meta: "4-5 people" },
  ],
  burger: [{ value: "Regular", label: "Regular", meta: "Served in a bun with side fries" }],
  juice: [{ value: "Glass", label: "Glass", meta: "Freshly blended" }],
  mocktail: [{ value: "Glass", label: "Glass", meta: "Non-alcoholic" }],
}

const PIZZA_MENU_ITEMS: MenuItemDefinition[] = [
  { name: "Margherita", description: "Classic tomato base and cheese.", prices: PIZZA_TYPE_PRICES.Margherita },
  {
    name: "Vegetarian",
    description: "Tomatoes, onions, green pepper and chilies.",
    prices: PIZZA_TYPE_PRICES.Vegetarian,
  },
  {
    name: "Beef Supreme",
    description: "Marinated beef, pineapple, and cheese.",
    prices: PIZZA_TYPE_PRICES["Beef Supreme"],
  },
  { name: "Hawaiian", description: "Pineapple, bacon, and cheese.", prices: PIZZA_TYPE_PRICES.Hawaiian },
  {
    name: "Meat Deluxe",
    description: "Beef, macon, ham, and pepperoni.",
    prices: PIZZA_TYPE_PRICES["Meat Deluxe"],
  },
  { name: "BBQ Steak", description: "Marinated beef with a BBQ finish.", prices: PIZZA_TYPE_PRICES["BBQ Steak"] },
  {
    name: "BBQ Chicken",
    description: "Marinated chicken with cheese.",
    prices: PIZZA_TYPE_PRICES["BBQ Chicken"],
  },
  {
    name: "Chicken Periperi",
    description: "Tender chicken with bold, spicy flavors and cheese.",
    prices: PIZZA_TYPE_PRICES["Chicken Periperi"],
  },
  {
    name: "Chicken Tikka",
    description: "Mild chicken, olives, bell pepper, and cheese.",
    prices: PIZZA_TYPE_PRICES["Chicken Tikka"],
  },
  {
    name: "Chicken Supreme",
    description: "Marinated chicken with pineapple.",
    prices: PIZZA_TYPE_PRICES["Chicken Supreme"],
  },
  {
    name: "Chicken Macon",
    description: "Marinated chicken, macon, onions, and sweetcorn.",
    prices: PIZZA_TYPE_PRICES["Chicken Macon"],
  },
]

const BURGER_MENU_ITEMS: MenuItemDefinition[] = [
  {
    name: "Beef Burger",
    description: "Beef patty in a bun with tomatoes, onions, lettuce, and side fries.",
    prices: { Regular: 300 },
  },
  {
    name: "Beef Burger & Cheese",
    description: "Beef patty in a bun with tomatoes, onions, lettuce, side fries, and cheese.",
    prices: { Regular: 350 },
  },
  {
    name: "Chicken Burger",
    description: "Grilled chicken breast in a bun with tomatoes, onions, lettuce, and side fries.",
    prices: { Regular: 400 },
  },
  {
    name: "Chicken Burger & Cheese",
    description: "Grilled chicken breast in a bun with tomatoes, onions, lettuce, side fries, and cheese.",
    prices: { Regular: 450 },
  },
  {
    name: "Veggie Burger",
    description: "Veggie-packed bun with tomatoes, onions, lettuce, and side fries.",
    prices: { Regular: 250 },
  },
  {
    name: "Bacon, Egg & Cheese Burger",
    description: "Bacon, fried egg, cheese, tomatoes, onions, lettuce, and side fries.",
    prices: { Regular: 550 },
  },
]

const JUICE_MENU_ITEMS: MenuItemDefinition[] = [
  { name: "Passion Juice", description: "Fresh passion juice.", prices: { Glass: 150 } },
  { name: "Mango Juice", description: "Fresh mango juice.", prices: { Glass: 150 } },
  { name: "Cocktail Juice", description: "Mixed fruit cocktail juice.", prices: { Glass: 150 } },
  { name: "Pineapple Mint Juice", description: "Pineapple juice finished with mint.", prices: { Glass: 150 } },
  { name: "Apple Juice", description: "Fresh apple juice.", prices: { Glass: 150 } },
]

const MOCKTAIL_MENU_ITEMS: MenuItemDefinition[] = [
  {
    name: "Strawberry Mojito",
    description: "Strawberry puree, lemon, mint, Sprite, and simple syrup.",
    prices: { Glass: 350 },
  },
  {
    name: "Passion Mojito",
    description: "Passion puree, lemon, mint, Sprite, and simple syrup.",
    prices: { Glass: 350 },
  },
  {
    name: "Mango Mojito",
    description: "Mango puree, lemon, mint, Sprite, and simple syrup.",
    prices: { Glass: 350 },
  },
  {
    name: "Orange Mojito",
    description: "Orange puree, lemon, mint, Sprite, and simple syrup.",
    prices: { Glass: 350 },
  },
  {
    name: "Virgin Mojito",
    description: "Lemon, lime, mint, Sprite, and simple syrup.",
    prices: { Glass: 350 },
  },
  {
    name: "Lemonade",
    description: "Lemon juice, lime, lemon, and simple syrup.",
    prices: { Glass: 350 },
  },
]

const MENU_ITEMS_BY_CATEGORY: Record<PizzaSideCategory, MenuItemDefinition[]> = {
  pizza: PIZZA_MENU_ITEMS,
  burger: BURGER_MENU_ITEMS,
  juice: JUICE_MENU_ITEMS,
  mocktail: MOCKTAIL_MENU_ITEMS,
}

export function isPizzaSideCategory(value: string): value is PizzaSideCategory {
  return value === "pizza" || value === "burger" || value === "juice" || value === "mocktail"
}

export function isPizzaMenuCategory(category: PizzaSideCategory): boolean {
  return category === "pizza"
}

export function getMenuCategoryOptions() {
  return Object.entries(MENU_CATEGORY_LABELS).map(([value, label]) => ({ value: value as PizzaSideCategory, label }))
}

export function getMenuCategoryLabel(category: PizzaSideCategory): string {
  return MENU_CATEGORY_LABELS[category]
}

export function getMenuItems(category: PizzaSideCategory): MenuItemDefinition[] {
  return MENU_ITEMS_BY_CATEGORY[category] ?? MENU_ITEMS_BY_CATEGORY.pizza
}

export function getMenuItemNames(category: PizzaSideCategory): string[] {
  return getMenuItems(category).map((item) => item.name)
}

export function getMenuSizeOptions(category: PizzaSideCategory): MenuSizeOption[] {
  return MENU_SIZE_OPTIONS[category] ?? MENU_SIZE_OPTIONS.pizza
}

export function getDefaultSizeForCategory(category: PizzaSideCategory): string {
  return getMenuSizeOptions(category)[0]?.value ?? "Regular"
}

export function getMenuItemDescription(category: PizzaSideCategory, itemName: string): string {
  return getMenuItems(category).find((item) => item.name === itemName)?.description ?? ""
}

export function isMenuItemValid(category: PizzaSideCategory, itemName: string): boolean {
  return getMenuItems(category).some((item) => item.name === itemName)
}

export function isMenuSizeValid(category: PizzaSideCategory, size: string): boolean {
  return getMenuSizeOptions(category).some((option) => option.value === size)
}

export function inferMenuCategory(itemName: string): PizzaSideCategory {
  if (BURGER_MENU_ITEMS.some((item) => item.name === itemName)) return "burger"
  if (JUICE_MENU_ITEMS.some((item) => item.name === itemName)) return "juice"
  if (MOCKTAIL_MENU_ITEMS.some((item) => item.name === itemName)) return "mocktail"
  return "pizza"
}

export function getPizzaUnitPrice(size: string, type: string, toppingsCount: number = 0): number {
  const typePrice = PIZZA_TYPE_PRICES[type]?.[size]
  const basePrice = PIZZA_BASE_PRICES[size] ?? PIZZA_BASE_PRICES.Medium
  const toppingsTotal = Math.max(0, toppingsCount) * 100
  return (typePrice ?? basePrice) + toppingsTotal
}

export function getMenuUnitPrice(
  category: PizzaSideCategory,
  size: string,
  itemName: string,
  toppingsCount: number = 0
): number {
  if (category === "pizza") {
    return getPizzaUnitPrice(size, itemName, toppingsCount)
  }

  const item = getMenuItems(category).find((entry) => entry.name === itemName)
  if (!item) return 0
  const fallbackPrice = Object.values(item.prices)[0] ?? 0
  return item.prices[size] ?? fallbackPrice
}
