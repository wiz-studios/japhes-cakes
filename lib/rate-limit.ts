const bucket = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = bucket.get(key)

  if (!current || now >= current.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now }
  }

  current.count += 1
  bucket.set(key, current)
  return { allowed: true, remaining: Math.max(limit - current.count, 0) }
}
