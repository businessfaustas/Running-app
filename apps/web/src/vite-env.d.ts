/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the GroupPace API. Unset → the app runs on built-in mock data. */
  readonly VITE_API_URL?: string
  /** MapLibre style URL; defaults to CARTO Dark Matter (no key needed). */
  readonly VITE_MAP_STYLE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
