export const NAIROBI_TIME_ZONE = "Africa/Nairobi"
export const NAIROBI_LOCALE = "en-KE"

type DateInput = string | number | Date | null | undefined

function toDate(input: DateInput): Date | null {
  if (input === null || input === undefined) return null
  const date = input instanceof Date ? input : new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

export function toNairobiDate(input: DateInput = new Date()) {
  const source = toDate(input) || new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NAIROBI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(source)

  const getPart = (type: string, fallback: string) =>
    parts.find((part) => part.type === type)?.value || fallback

  return new Date(
    Number(getPart("year", "1970")),
    Number(getPart("month", "01")) - 1,
    Number(getPart("day", "01")),
    Number(getPart("hour", "00")),
    Number(getPart("minute", "00")),
    Number(getPart("second", "00"))
  )
}

export function formatInNairobi(
  input: DateInput,
  options: Intl.DateTimeFormatOptions,
  locale = NAIROBI_LOCALE
) {
  const date = toDate(input)
  if (!date) return "N/A"

  return new Intl.DateTimeFormat(locale, {
    timeZone: NAIROBI_TIME_ZONE,
    ...options,
  }).format(date)
}

export function formatDateTimeNairobi(input: DateInput, options: Intl.DateTimeFormatOptions = {}) {
  return formatInNairobi(
    input,
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      ...options,
    },
    NAIROBI_LOCALE
  )
}

export function formatDateNairobi(input: DateInput, options: Intl.DateTimeFormatOptions = {}) {
  return formatInNairobi(
    input,
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      ...options,
    },
    NAIROBI_LOCALE
  )
}

export function getNairobiDayKey(input: DateInput) {
  const date = toNairobiDate(input)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function getNairobiHour(input: DateInput = new Date()) {
  return toNairobiDate(input).getHours()
}

export function getNairobiWeekday(input: DateInput = new Date()) {
  return toNairobiDate(input).getDay()
}
