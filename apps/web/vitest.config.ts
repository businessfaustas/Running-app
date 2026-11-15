import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Unit tests only; the browser tests in e2e/ are run by Playwright.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'env-guard.test.ts'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
  }),
)
