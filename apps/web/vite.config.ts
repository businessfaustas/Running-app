import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { PUBLIC_ENV_PREFIXES, publicEnvGuard } from './env-guard.ts'
import { seoFiles } from './seo-plugin.ts'
import { websiteJsonLd } from './src/lib/seo.ts'

/**
 * Link previews (Facebook, Messenger, Slack…) need absolute URLs. The site's address comes from
 * VITE_SITE_URL, else the production domain Vercel exposes at build time.
 */
const siteOrigin = () => {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return (process.env.VITE_SITE_URL ?? (vercel ? `https://${vercel}` : '')).replace(/\/$/, '')
}

function siteUrl(): Plugin {
  return {
    name: 'pacemates:site-url',
    // The home page's structured data comes from src/lib/seo.ts, so there's one source of truth.
    transformIndexHtml: (html) =>
      html
        .replace(
          '__JSON_LD__',
          JSON.stringify(websiteJsonLd(siteOrigin())).replaceAll('<', '\\u003c'),
        )
        .replaceAll('%SITE_URL%', siteOrigin()),
  }
}

export default defineConfig({
  plugins: [publicEnvGuard(), siteUrl(), seoFiles(siteOrigin), react(), tailwindcss()],
  // NEXT_PUBLIC_* lets the Vercel ↔ Supabase integration's variables work without renaming.
  envPrefix: PUBLIC_ENV_PREFIXES,
  define: {
    // Release name for error reports: the deployed commit on Vercel.
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    ),
  },
  server: { port: 5173 },
  // maplibre-gl (~1 MB) is only fetched when a map is on screen.
  build: { chunkSizeWarningLimit: 1200 },
})
