import { expect, test as base, type Page } from '@playwright/test'

/** Third-party hosts the app talks to; tests never reach the real ones. */
const EXTERNAL =
  /(tiles\.openfreemap\.org|vitals\.vercel-insights\.com|va\.vercel-scripts\.com|sentry\.io)/

/** An empty but valid map style, so the map code runs without reaching the internet. */
export const EMPTY_MAP_STYLE = JSON.stringify({ version: 8, sources: {}, layers: [] })

/** A workout on a future day that the sample athlete hasn't joined – always open to join. */
export const OPEN_WORKOUT = '/workouts/b0000000-0000-4000-8000-000000000012'
export const OPEN_RACE = '/races/trail-kursiu-nerija'

export const test = base.extend<{ errors: string[] }>({
  // `auto`: runs for every test, so none of them forgets to block third parties or skip the intro.
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        if (
          m.type() === 'error' &&
          !EXTERNAL.test(m.text()) &&
          !/Failed to load resource/.test(m.text())
        )
          errors.push(`console: ${m.text()}`)
      })
      await page.route(EXTERNAL, (route) =>
        /openfreemap/.test(route.request().url())
          ? route.fulfill({ contentType: 'application/json', body: EMPTY_MAP_STYLE })
          : route.fulfill({ status: 204, body: '' }),
      )
      await page.addInitScript(() => {
        try {
          localStorage.setItem('pacemates:welcomed', '1')
        } catch {
          // private mode
        }
      })
      await use(errors)
    },
    { auto: true },
  ],
})

export { expect }

/**
 * Waits until the page has stopped changing: loading placeholders are gone, and every finite
 * animation (fades, slides, count-ups) has finished, including ones that only start once data
 * arrives. Measurements such as contrast or positions are only meaningful after this. A fixed
 * sleep either wastes time or flakes on a busy CI machine; this waits exactly as long as needed.
 * Endless animations (the pulsing "now" marker) are left running.
 */
export async function settled(page: Page) {
  await page
    .locator('.skeleton')
    .first()
    .waitFor({ state: 'detached', timeout: 15_000 })
    .catch(() => undefined)
  for (let round = 0; round < 6; round++) {
    const running = await page.evaluate(async () => {
      // Two frames, so styles for anything that just mounted are computed and its animations exist.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const finite = document
        .getAnimations()
        // Scroll-driven animations (the header photo's parallax) follow the scroll position and
        // never "finish"; only time-based ones are waited for.
        .filter(
          (a) => a.timeline === document.timeline && a.effect?.getTiming().iterations !== Infinity,
        )
      await Promise.all(finite.map((a) => a.finished.catch(() => undefined)))
      return finite.length
    })
    // Let anything the last round triggered (data arriving, a list mounting) start, then look again.
    await page.waitForTimeout(80)
    if (running === 0) break
  }
}

/** Signs in as the sample athlete (preview mode). */
export async function signInAsSample(page: Page) {
  await page.goto('/signin')
  await page.getByRole('button', { name: 'Išbandyti kaip Gabija' }).click()
  await expect(page).not.toHaveURL(/signin/)
}

export const TAB_PAGES = ['/', '/races', '/clubs', '/plans', '/inspire', '/inbox', '/profile']
export const PUBLIC_PAGES = ['/', '/races', '/clubs', '/leaderboard', '/privatumas', '/salygos']
