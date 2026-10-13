import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // NEXT_PUBLIC_* lets the Vercel ↔ Supabase integration's variables work without renaming.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: { port: 5173 },
  // maplibre-gl (~1 MB) is only fetched when a map is on screen.
  build: { chunkSizeWarningLimit: 1200 },
})
