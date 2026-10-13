import { setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// MapLibre locates its worker relative to its own module URL, which bundling rewrites,
// so hand it the worker file explicitly (works in dev and in production builds).
setWorkerUrl(maplibreWorkerUrl)

/** OpenFreeMap: free, no API key, commercial use allowed. Override with VITE_MAP_STYLE_URL. */
export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/dark'

/** Where maps open when there's nothing to show yet. */
export const DEFAULT_CENTER = { lng: 4.8852, lat: 52.3676 }
