import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The app reads its settings when imported, so tests set a dummy database address first.
    env: {
      DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test',
      CORS_ORIGIN: 'https://pacemates.test',
    },
  },
})
