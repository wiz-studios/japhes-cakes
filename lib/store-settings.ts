export type BusyModeAction = "disable_orders" | "increase_eta"

export type StoreSettings = {
  busyModeEnabled: boolean
  busyModeAction: BusyModeAction
  busyModeExtraMinutes: number
  busyModeMessage: string
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  busyModeEnabled: false,
  busyModeAction: "disable_orders",
  busyModeExtraMinutes: 20,
  busyModeMessage: "We are currently overloaded. Please try again shortly.",
}

export function normalizeStoreSettings(row: any): StoreSettings {
  if (!row || typeof row !== "object") return DEFAULT_STORE_SETTINGS

  const action: BusyModeAction =
    row.busy_mode_action === "increase_eta" ? "increase_eta" : "disable_orders"

  const extraMinutes = Number(row.busy_mode_extra_minutes)
  const safeExtraMinutes = Number.isFinite(extraMinutes) && extraMinutes >= 0
    ? Math.min(Math.round(extraMinutes), 180)
    : DEFAULT_STORE_SETTINGS.busyModeExtraMinutes

  const message = typeof row.busy_mode_message === "string" && row.busy_mode_message.trim().length > 0
    ? row.busy_mode_message.trim()
    : DEFAULT_STORE_SETTINGS.busyModeMessage

  return {
    busyModeEnabled: Boolean(row.busy_mode_enabled),
    busyModeAction: action,
    busyModeExtraMinutes: safeExtraMinutes,
    busyModeMessage: message,
  }
}

export function applyBusyEtaWindow(baseWindow: string | null | undefined, extraMinutes: number): string {
  const safeBase = (baseWindow || "As soon as possible").trim()
  const safeExtra = Math.max(0, Math.round(extraMinutes))
  if (!safeExtra) return safeBase

  const rangeMatch = safeBase.match(/(\d+)\s*-\s*(\d+)\s*(mins?|minutes)/i)
  if (rangeMatch) {
    const min = Number(rangeMatch[1]) + safeExtra
    const max = Number(rangeMatch[2]) + safeExtra
    return safeBase.replace(rangeMatch[0], `${min}-${max} ${rangeMatch[3]}`)
  }

  const singleMatch = safeBase.match(/(\d+)\s*(mins?|minutes)/i)
  if (singleMatch) {
    const updated = Number(singleMatch[1]) + safeExtra
    return safeBase.replace(singleMatch[0], `${updated} ${singleMatch[2]}`)
  }

  return `${safeBase} (+${safeExtra} mins busy mode)`
}
