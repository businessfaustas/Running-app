import { describe, expect, it } from 'vitest'
import { secretReason } from './env-guard.ts'

const jwt = (payload: object) =>
  ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'sig'].join('.')

describe('secretReason', () => {
  it('allows public keys', () => {
    expect(secretReason('VITE_SUPABASE_ANON_KEY', jwt({ role: 'anon' }))).toBeNull()
    expect(secretReason('VITE_SUPABASE_ANON_KEY', 'sb_publishable_abc123')).toBeNull()
    expect(secretReason('VITE_SENTRY_DSN', 'https://abc@o1.ingest.sentry.io/1')).toBeNull()
    expect(secretReason('VITE_SUPABASE_URL', 'https://xyz.supabase.co')).toBeNull()
  })

  it('catches secrets by value', () => {
    expect(secretReason('VITE_SUPABASE_ANON_KEY', jwt({ role: 'service_role' }))).toMatch(
      /service_role/,
    )
    expect(secretReason('VITE_SUPABASE_ANON_KEY', 'sb_secret_abc123')).toMatch(/secret key/)
    expect(secretReason('VITE_DB', 'postgresql://user:pw@host/db')).toMatch(/connection string/)
    expect(secretReason('VITE_SENTRY', 'sntrys_abc')).toMatch(/Sentry/)
  })

  it('catches secrets by name', () => {
    expect(secretReason('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', 'x')).toMatch(/name/)
    expect(secretReason('VITE_JWT_SECRET', 'x')).toMatch(/name/)
  })
})
