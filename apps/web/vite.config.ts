import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { PUBLIC_ENV_PREFIXES, publicEnvGuard } from './env-guard.ts'

export default defineConfig({
  plugins: [publicEnvGuard(), react(), tailwindcss()],
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
