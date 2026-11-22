import { expect, OPEN_RACE, test } from './fixtures'

/** What search engines and answer engines see. */
test.describe('SEO and AEO @live', () => {
  test('serves a sitemap listing races and clubs with absolute URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/xml/)
    const xml = await res.text()
    expect(xml).toContain('<urlset')
    expect(xml).toContain('/races/trail-kursiu-nerija')
    expect(xml).toMatch(/<loc>https?:\/\//)
    expect(xml).toContain('/plus')
    expect(xml).not.toContain('/signin')
    expect(xml).not.toContain('/stats')
  })

  test('serves robots.txt pointing at the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
    const txt = await res.text()
    expect(txt).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m)
    expect(txt).toContain('Disallow: /settings')
    expect(txt).toContain('Disallow: /stats')
  })

  test('serves llms.txt', async ({ request }) => {
    const res = await request.get('/llms.txt')
    expect(res.status()).toBe(200)
    expect(await res.text()).toContain('# PaceMates')
  })

  test('the home page carries valid structured data, a canonical link and social tags', async ({
    page,
  }) => {
    await page.goto('/')
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(blocks.length).toBeGreaterThan(0)
    const data = blocks.flatMap((b) => JSON.parse(b))
    const types = data.map((d: { '@type': string }) => d['@type'])
    expect(types).toEqual(expect.arrayContaining(['WebSite', 'Organization', 'FAQPage']))
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\//)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.png$/)
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'lt')
  })

  test('a race page gets its own title, description, canonical and SportsEvent data', async ({
    page,
  }) => {
    await page.goto(OPEN_RACE)
    await expect(page).toHaveTitle(/Trail Kuršių Nerija – PaceMates/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Kuršių/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/races\/trail-kursiu-nerija$/,
    )
    const ld = await page.locator('script[data-page-meta]').first().textContent()
    expect(JSON.parse(ld!)).toMatchObject({ '@type': 'SportsEvent', name: 'Trail Kuršių Nerija' })
  })

  test('leaving a page puts the home page’s title back', async ({ page }) => {
    await page.goto('/races')
    await expect(page).toHaveTitle(/Varžybos – PaceMates/)
    await page.goto('/')
    await expect(page).toHaveTitle('PaceMates – bėk ir mink kartu')
  })

  test('crawlers without JavaScript still get a heading and links', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /PaceMates/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Varžybos' })).toBeVisible()
    await ctx.close()
  })

  test('manifest, icons and social image are served', async ({ request }) => {
    for (const path of [
      '/manifest.webmanifest',
      '/icon.svg',
      '/favicon-32.png',
      '/apple-touch-icon.png',
      '/og.png',
    ]) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(200)
    }
  })
})
