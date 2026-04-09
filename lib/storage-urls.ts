const STORAGE_ROUTE_BUCKETS = new Set(["cake-designs", "school-gallery"])

export function extractStoragePath(value: string | null | undefined, bucket: string): string | null {
  const raw = value?.trim()
  if (!raw) return null

  const publicMarker = `/${bucket}/`
  const publicIndex = raw.indexOf(publicMarker)
  if (publicIndex >= 0) {
    return raw.slice(publicIndex + publicMarker.length)
  }

  try {
    const url = new URL(raw, "http://local")
    const pathFromQuery = url.searchParams.get("path")?.trim()
    if (pathFromQuery) return pathFromQuery
  } catch {
    // Ignore malformed URLs and fall back to raw path handling.
  }

  return raw.replace(/^\/+/, "")
}

export function buildStorageAssetUrl(bucket: string, path: string): string {
  if (!STORAGE_ROUTE_BUCKETS.has(bucket)) {
    throw new Error(`Unsupported storage bucket: ${bucket}`)
  }

  const params = new URLSearchParams({ path })
  return `/api/storage/${bucket}?${params.toString()}`
}
