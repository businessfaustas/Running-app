import type { RequestHandler } from 'express'

interface Options {
  /** Requests allowed per window, per client IP. */
  max: number
  windowMs: number
}

/**
 * Small fixed-window rate limiter kept in memory. Fine for a single API instance; behind
 * several instances, put the limits in a shared store (or rely on the database triggers,
 * which limit writes per user no matter which server they came through).
 */
export function rateLimit({ max, windowMs }: Options): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>()

  // Forget finished windows now and then so the map can't grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key)
  }, windowMs)
  sweep.unref()

  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count += 1

    const remaining = Math.max(0, max - entry.count)
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000)
    res.setHeader('RateLimit-Limit', String(max))
    res.setHeader('RateLimit-Remaining', String(remaining))
    res.setHeader('RateLimit-Reset', String(resetSeconds))

    if (entry.count > max) {
      res.setHeader('Retry-After', String(resetSeconds))
      res.status(429).json({ error: 'Too many requests, try again shortly.' })
      return
    }
    next()
  }
}
