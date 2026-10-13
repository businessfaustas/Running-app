import { browserStorage, createDemoBackend, watchBrowserStorage } from './demo'
import type { Backend } from './types'

export * from './types'

// The Vercel ↔ Supabase integration provides NEXT_PUBLIC_* names; VITE_* works too.
const env = import.meta.env
const supabaseUrl = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  env.VITE_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/**
 * Supabase when it's configured, otherwise the on-device preview. The Supabase client is
 * only downloaded when it's actually used.
 */
export const backend: Backend =
  supabaseUrl && supabaseKey
    ? (await import('./supabase')).createSupabaseBackend(supabaseUrl, supabaseKey)
    : createDemoBackend({ storage: browserStorage(), watchStorage: watchBrowserStorage })
