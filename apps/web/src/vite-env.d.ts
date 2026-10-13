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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
