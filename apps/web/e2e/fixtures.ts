import { expect, test as base, type Page } from '@playwright/test'

/** Third-party hosts the app talks to; tests never reach the real ones. */
const EXTERNAL =
  /(tiles\.openfreemap\.org|vitals\.vercel-insights\.com|va\.vercel-scripts\.com|sentry\.io)/

/**
 * Vercel's analytics and speed-insights scripts only exist once those features are switched on in
 * the Vercel project. When they aren't, the browser logs a failed request for them. That is an
 * owner to-do (docs/RUNBOOK.md), not a broken page, so it must not fail the smoke tests.
 */
const VERCEL_TELEMETRY = /\/_vercel\/(insights|speed-insights)\//

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
          !VERCEL_TELEMETRY.test(m.text()) &&
          !VERCEL_TELEMETRY.test(m.location().url) &&
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
  for (let round = 0; round < 8; round++) {
    // 1. Wait for the page to stop changing: on a slower device a lazy page's content can mount
    //    well after "load", and only then do its fade-ins begin.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let timer = setTimeout(done, 350)
          const observer = new MutationObserver(() => {
            clearTimeout(timer)
            timer = setTimeout(done, 350)
          })
          const hardStop = setTimeout(done, 6000)
          function done() {
            observer.disconnect()
            clearTimeout(timer)
            clearTimeout(hardStop)
            resolve()
          }
          observer.observe(document.body, { subtree: true, childList: true, attributes: true })
        }),
    )
    // 2. Wait for every time-based animation that is running (scroll-driven ones never finish).
    const running = await page.evaluate(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const finite = document
        .getAnimations()
        .filter(
          (a) => a.timeline === document.timeline && a.effect?.getTiming().iterations !== Infinity,
        )
      await Promise.all(finite.map((a) => a.finished.catch(() => undefined)))
      return finite.length
    })
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
export const PUBLIC_PAGES = [
  '/',
  '/races',
  '/clubs',
  '/leaderboard',
  '/plus',
  '/privatumas',
  '/salygos',
]
