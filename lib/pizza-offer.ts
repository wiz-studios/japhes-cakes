const OFFER_DAYS = ["Tue", "Thu"] as const
const ELIGIBLE_SIZES = ["Medium", "Large"] as const

function getWeekdayInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date)
}

export function isPizzaOfferDay(date: Date = new Date(), timeZone: string = "Africa/Nairobi"): boolean {
  const day = getWeekdayInTimeZone(date, timeZone)
  return OFFER_DAYS.includes(day as (typeof OFFER_DAYS)[number])
}

export function getPizzaOfferDetails({
  size,
  quantity,
  unitPrice,
  date = new Date(),
  timeZone = "Africa/Nairobi",
}: {
  size: string
  quantity: number
  unitPrice: number
  date?: Date
  timeZone?: string
}) {
  const safeQty = Math.max(1, Number.isFinite(quantity) ? quantity : 1)
  const eligibleSize = ELIGIBLE_SIZES.includes(size as (typeof ELIGIBLE_SIZES)[number])
  const offerDay = isPizzaOfferDay(date, timeZone)

  if (!offerDay || !eligibleSize || safeQty < 2 || unitPrice <= 0) {
    return { isEligible: false, discount: 0, freeQuantity: 0, chargeableQuantity: safeQty }
  }

  const chargeableQuantity = Math.ceil(safeQty / 2)
  const freeQuantity = Math.max(safeQty - chargeableQuantity, 0)
  const discount = freeQuantity * unitPrice

  return { isEligible: true, discount, freeQuantity, chargeableQuantity }
}
