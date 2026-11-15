import { defineConfig, devices } from '@playwright/test'

/*
 * End-to-end tests run against the production build served by `vite preview`, in preview
 * mode (no Supabase), so they need no secrets and never touch real data.
 *
 *   pnpm --filter @pacemates/web build && pnpm --filter @pacemates/web test:e2e
 *
 * Locally only Chromium may be installed: E2E_CHROMIUM_ONLY=1 runs the Safari-sized phone and
 * tablet in Chromium. CI installs WebKit too, so the iPhone and iPad run in real Safari engines.
 */
const chromiumOnly = Boolean(process.env.E2E_CHROMIUM_ONLY)
const asChromium = chromiumOnly ? { defaultBrowserType: 'chromium' as const } : {}
const PORT = 4173
/** Set to test a deployed site (e.g. right after a release) instead of the local build. */
const remote = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: remote ?? `http://127.0.0.1:${PORT}`,
    trace: 'off',
    screenshot: 'only-on-failure',
    locale: 'lt-LT',
    timezoneId: 'Europe/Vilnius',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-13', use: { ...devices['iPhone 13'], ...asChromium } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'], ...asChromium } },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'], ...asChromium } },
  ],
  webServer: remote
    ? undefined
    : {
    command: `pnpm exec vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
