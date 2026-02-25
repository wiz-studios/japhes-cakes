const bucket = new Map<string, { count: number; resetAt: number }>()
let checksSinceCleanup = 0

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  checksSinceCleanup += 1
  if (checksSinceCleanup >= 500) {
    checksSinceCleanup = 0
    for (const [entryKey, value] of bucket.entries()) {
      if (value.resetAt <= now) bucket.delete(entryKey)
    }
  }
  const current = bucket.get(key)

  if (!current || now >= current.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now, resetAt: current.resetAt }
  }

  current.count += 1
  bucket.set(key, current)
  return { allowed: true, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt }
}
