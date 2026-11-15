import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler } from 'express'

/*
 * Structured logging: one JSON object per line on stdout, which Vercel, Render, Fly and
 * every log shipper can read and filter. No request bodies, query strings, cookies or auth
 * headers are ever logged – only what's needed to follow a request and spot trouble.
 */

type Level = 'info' | 'warn' | 'error'

export function log(level: Level, message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })
  if (level === 'error') console.error(line)
  else console.log(line)
}

/** Gives each request an id (returned as X-Request-Id) and logs it when it finishes. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const id = req.header('x-request-id')?.slice(0, 64) || randomUUID()
  res.setHeader('X-Request-Id', id)
  res.locals.requestId = id
  const started = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    log(res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info', 'request', {
      requestId: id,
      method: req.method,
      // The path only: query strings can carry coordinates and dates that identify people.
      path: req.path,
      status: res.statusCode,
      ms: Math.round(ms),
    })
  })
  next()
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' })
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Body-parser errors (too large, bad JSON) are the caller's fault, not ours.
  const status =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500
  if (status >= 500) {
    log('error', 'unhandled error', {
      requestId: res.locals.requestId,
      path: req.path,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    res.status(500).json({ error: 'Internal server error', requestId: res.locals.requestId })
    return
  }
  res.status(status).json({ error: status === 413 ? 'Request too large' : 'Bad request' })
}
