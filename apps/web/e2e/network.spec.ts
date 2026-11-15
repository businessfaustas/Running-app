import { expect, test } from './fixtures'

/** Slow and broken connections, emulated through Chrome's DevTools protocol. */
test.describe('slow networks', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'network throttling needs Chromium')

  // "Slow 3G" as Lighthouse defines it: 400 ms round trip, about 400 kbit/s.
  test('home page becomes usable on a slow 3G connection', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    })
    const started = Date.now()
    await page.goto('/', { waitUntil: 'commit' })
    // The splash screen is inside the HTML, so something is on screen almost at once.
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 5_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Šiandien', {
      timeout: 40_000,
    })
    const seconds = (Date.now() - started) / 1000
    console.log(`slow 3G: interactive after ${seconds.toFixed(1)} s`)
    expect(seconds).toBeLessThan(40)
  })

  test('shows a clear banner when the connection drops, and hides it when it returns', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await context.setOffline(true)
    await expect(page.getByText('Nėra interneto ryšio')).toBeVisible()
    await context.setOffline(false)
    await expect(page.getByText('Nėra interneto ryšio')).toBeHidden()
  })

  test('keeps working when third-party services (maps, analytics) are unreachable', async ({
    page,
    errors,
  }) => {
    await page.route(/openfreemap|vercel|sentry/, (r) => r.abort())
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Žemėlapis' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([])
  })
})
