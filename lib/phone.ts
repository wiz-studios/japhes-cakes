export const KENYA_PHONE_REGEX = /^(07|01)\d{8}$/

export function normalizeKenyaPhone(input: string): string {
  const digits = input.replace(/\D/g, "")

  if (digits.startsWith("254") && digits.length >= 12) {
    return `0${digits.slice(3, 12)}`
  }

  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
    return `0${digits}`
  }

  if (digits.startsWith("07") || digits.startsWith("01")) {
    return digits.slice(0, 10)
  }

  return digits.slice(0, 10)
}

export function isValidKenyaPhone(input: string): boolean {
  return KENYA_PHONE_REGEX.test(input)
}

export function toKenyaMsisdn(input: string): string | null {
  const normalized = normalizeKenyaPhone(input)
  if (!isValidKenyaPhone(normalized)) return null
  return `254${normalized.slice(1)}`
}

export function maskPhoneNumber(input: string): string {
  const raw = String(input || "")
  const normalized = normalizeKenyaPhone(raw)
  const digits = isValidKenyaPhone(normalized) ? normalized : raw.replace(/\D/g, "")

  if (!digits) return ""

  if (digits.length <= 3) {
    return `${digits[0]}${"*".repeat(Math.max(digits.length - 1, 0))}`
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 2)}${"*".repeat(Math.max(digits.length - 3, 1))}${digits.slice(-1)}`
  }

  const visibleStart = digits.slice(0, 4)
  const visibleEnd = digits.slice(-2)
  const hiddenCount = Math.max(digits.length - 6, 1)
  return `${visibleStart}${"*".repeat(hiddenCount)}${visibleEnd}`
}
