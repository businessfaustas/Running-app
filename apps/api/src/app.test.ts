import type { AddressInfo } from 'node:net'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app'

let base = ''
let close: () => Promise<void>

beforeAll(async () => {
  const server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  close = () => new Promise((resolve) => server.close(() => resolve()))
})
afterAll(() => close())

describe('API basics', () => {
  it('answers the health check, with a request id for tracing', async () => {
    const res = await fetch(`${base}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  it('does not advertise what it runs on', async () => {
    const res = await fetch(`${base}/health`)
    expect(res.headers.get('x-powered-by')).toBeNull()
  })

  it('rejects a bad query before touching the database', async () => {
    const res = await fetch(`${base}/slots?from=tomorrow`)
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('Invalid query')
  })

  it('answers unknown paths with JSON 404, not a stack trace or an HTML page', async () => {
    const res = await fetch(`${base}/admin`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  it('refuses oversized bodies', async () => {
    const res = await fetch(`${base}/slots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filler: 'x'.repeat(20_000) }),
    })
    expect(res.status).toBe(413)
  })

  it('only lets the configured web origin read responses from a browser', async () => {
    const allowed = await fetch(`${base}/health`, { headers: { Origin: 'https://pacemates.test' } })
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://pacemates.test')
    const other = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } })
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
  })
})

// "Auth on every endpoint": this API has no sign-in, so every route has to be a deliberate,
// read-only, public one. A new route or a write verb fails here until someone decides it on purpose.
describe('every endpoint is accounted for', () => {
  const PUBLIC_READ_ONLY = ['GET /health', 'GET /slots']

  it('has no write routes at all', () => {
    const dir = join(import.meta.dirname, 'routes')
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const source = readFileSync(join(dir, file), 'utf8')
      expect(source, `${file} defines a write route`).not.toMatch(/\.(post|put|patch|delete|all)\(/)
    }
  })

  it('answers write verbs on every known path with 404, never with data', async () => {
    for (const route of PUBLIC_READ_ONLY) {
      const path = route.split(' ')[1]!
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const res = await fetch(`${base}${path}`, { method })
        expect(res.status, `${method} ${path}`).toBe(404)
      }
    }
  })

  it('has exactly the public routes listed above', () => {
    const app = readFileSync(join(import.meta.dirname, 'app.ts'), 'utf8')
    const slots = readFileSync(join(import.meta.dirname, 'routes/slots.ts'), 'utf8')
    const found = [
      ...[...app.matchAll(/app\.get\('([^']+)'/g)].map((m) => `GET ${m[1]}`),
      ...[...app.matchAll(/app\.use\('(\/[^']*)'/g)].map((m) => `USE ${m[1]}`),
      ...[...slots.matchAll(/slotsRouter\.get\('([^']+)'/g)].map(
        (m) => `GET /slots${m[1] === '/' ? '' : m[1]}`,
      ),
    ]
    expect(found.sort()).toEqual(['GET /health', 'GET /slots', 'USE /slots'].sort())
  })
})

describe('rate limiting', () => {
  it('stops a client that hammers write endpoints (30 a minute)', async () => {
    let limited = 0
    for (let i = 0; i < 40; i++) {
      const res = await fetch(`${base}/slots`, { method: 'POST' })
      if (res.status === 429) limited++
    }
    expect(limited).toBeGreaterThanOrEqual(9)
    const res = await fetch(`${base}/slots`, { method: 'POST' })
    expect(res.headers.get('retry-after')).toBeTruthy()
  })
})
