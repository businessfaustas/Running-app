import { EMPTY_MAP_STYLE, expect, OPEN_WORKOUT, signInAsSample, TAB_PAGES, test } from './fixtures'

/** Bugs that were fixed once and must stay fixed. Each test says what went wrong. */
test.describe('regression', () => {
  test('no page scrolls sideways (content wider than the screen)', async ({ page }) => {
    await signInAsSample(page)
    for (const path of [...TAB_PAGES, '/leaderboard', '/badges', OPEN_WORKOUT, '/workouts/new']) {
      await page.goto(path)
      await page.waitForTimeout(400)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1)
    }
  })

  test('the tab bar shows on tab pages and not on pages opened from them', async ({ page }) => {
    await page.goto('/races')
    await expect(page.getByRole('navigation', { name: 'Pagrindinis meniu' })).toBeVisible()
    await page.goto(OPEN_WORKOUT)
    await expect(page.getByRole('navigation', { name: 'Pagrindinis meniu' })).toHaveCount(0)
  })

  test('back from a race returns to the race list', async ({ page }) => {
    await page.goto('/races')
    await page.locator('a[href^="/races/"]').first().click()
    await expect(page).toHaveURL(/\/races\/.+/)
    await page.goBack()
    await expect(page).toHaveURL(/\/races$/)
  })

  test('every sport tile in "new workout" shows its photo (no broken images)', async ({ page }) => {
    await signInAsSample(page)
    await page.goto('/workouts/new')
    await page.waitForLoadState('networkidle')
    const broken = await page.$$eval('img', (imgs) =>
      imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
    )
    expect(broken).toEqual([])
    expect(await page.locator('img').count()).toBeGreaterThanOrEqual(6)
  })

  test('the join confirmation stays inside the app column on wide screens', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'wide-screen layout')
    await signInAsSample(page)
    await page.goto(OPEN_WORKOUT)
    await page.getByRole('button', { name: 'Dalyvausiu' }).click()
    const box = await page.getByRole('dialog').boundingBox()
    expect(box!.width).toBeLessThanOrEqual(700)
  })

  test('the join confirmation fits a phone without cutting off its buttons', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'phone layout')
    await signInAsSample(page)
    await page.goto(OPEN_WORKOUT)
    await page.getByRole('button', { name: 'Dalyvausiu' }).click()
    const dialog = page.getByRole('dialog')
    for (const name of ['Puiku', 'Į pokalbį']) {
      const box = await dialog.getByRole('button', { name }).boundingBox()
      const viewport = page.viewportSize()!
      expect(box!.y + box!.height, `${name} is cut off`).toBeLessThanOrEqual(viewport.height + 1)
    }
  })

  test('people who ask for reduced motion get no long animations', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.addInitScript(() => localStorage.setItem('pacemates:welcomed', '1'))
    await page.route(/tiles\.openfreemap\.org/, (r) =>
      r.fulfill({ contentType: 'application/json', body: EMPTY_MAP_STYLE }),
    )
    await page.goto('/races')
    await page.waitForTimeout(500)
    const long = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (a) =>
            Number(a.effect?.getTiming().duration) > 50 &&
            a.effect?.getTiming().iterations !== Infinity,
        )
        .map((a) => (a as CSSAnimation).animationName ?? 'transition'),
    )
    expect(long).toEqual([])
    await ctx.close()
  })

  test('the workout count on Discover matches the list under it', async ({ page }) => {
    await page.goto('/')
    const heading = page.getByRole('heading', { level: 1 })
    // The number counts up when the page opens, so wait for it to settle.
    await expect(heading).toContainText(/[1-9]\d*\s+treniruo/)
    await page.waitForTimeout(900)
    const count = Number((await heading.innerText()).match(/(\d+)\s+treniruo/)![1])
    await expect(page.getByRole('button', { name: /^Visi/ })).toContainText(String(count))
  })
})
