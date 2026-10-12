import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  // maplibre-gl (~1 MB) is only fetched when the map view opens.
  build: { chunkSizeWarningLimit: 1200 },
})
