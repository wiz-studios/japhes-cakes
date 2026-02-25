type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type DeliveryZone = {
  id: string
  name: string
  delivery_fee: number
  delivery_window: string
  allows_cake: boolean
  allows_pizza: boolean
  scheduled_only?: boolean
}

const zoneListCache = new Map<string, CacheEntry<DeliveryZone[]>>()
const zoneByIdCache = new Map<string, CacheEntry<DeliveryZone | null>>()

function getZonesCacheTtlMs(): number {
  const parsed = Number(process.env.DELIVERY_ZONES_CACHE_TTL_MS || 5 * 60 * 1000)
  if (!Number.isFinite(parsed)) return 5 * 60 * 1000
  return Math.min(Math.max(parsed, 30 * 1000), 30 * 60 * 1000)
}

function normalizeZone(row: any): DeliveryZone {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    delivery_fee: Number(row.delivery_fee || 0),
    delivery_window: String(row.delivery_window || "As soon as possible"),
    allows_cake: Boolean(row.allows_cake),
    allows_pizza: Boolean(row.allows_pizza),
    scheduled_only: Boolean(row.scheduled_only),
  }
}

export async function listDeliveryZonesCached(
  supabase: any,
  type: "cake" | "pizza"
): Promise<DeliveryZone[]> {
  const cacheKey = `list:${type}`
  const cached = zoneListCache.get(cacheKey)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const allowColumn = type === "cake" ? "allows_cake" : "allows_pizza"
  const { data } = await supabase
    .from("delivery_zones")
    .select("id, name, delivery_fee, delivery_window, allows_cake, allows_pizza, scheduled_only")
    .eq(allowColumn, true)
    .order("name")

  const zones = (data || []).map((row: any) => normalizeZone(row))
  const expiresAt = now + getZonesCacheTtlMs()

  zoneListCache.set(cacheKey, { value: zones, expiresAt })
  for (const zone of zones) {
    zoneByIdCache.set(zone.id, { value: zone, expiresAt })
  }

  return zones
}

export async function getDeliveryZoneByIdCached(supabase: any, zoneId: string): Promise<DeliveryZone | null> {
  const cacheKey = `id:${zoneId}`
  const cached = zoneByIdCache.get(cacheKey)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const { data } = await supabase
    .from("delivery_zones")
    .select("id, name, delivery_fee, delivery_window, allows_cake, allows_pizza, scheduled_only")
    .eq("id", zoneId)
    .maybeSingle()

  const zone = data ? normalizeZone(data) : null
  const expiresAt = now + getZonesCacheTtlMs()
  zoneByIdCache.set(cacheKey, { value: zone, expiresAt })
  return zone
}
