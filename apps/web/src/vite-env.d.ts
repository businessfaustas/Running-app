/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Unset → the app runs in on-device preview mode. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Names used by the Vercel ↔ Supabase integration. */
  readonly NEXT_PUBLIC_SUPABASE_URL?: string
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
  /** MapLibre style URL; defaults to OpenFreeMap Dark (no key needed). */
  readonly VITE_MAP_STYLE_URL?: string
  /** Sentry DSN for error tracking (public by design). Unset → errors only go to the console. */
  readonly VITE_SENTRY_DSN?: string
  /** When set, the whole app is replaced by a maintenance notice with this text. */
  readonly VITE_MAINTENANCE_MESSAGE?: string
  /** Release name for error reports; set automatically from the Vercel commit at build time. */
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
