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
