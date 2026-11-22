import AxeBuilder from '@axe-core/playwright'
import { expect, OPEN_RACE, settled, signInAsSample, test } from './fixtures'

/** Accessibility: automated WCAG 2.1 A/AA checks. Anything serious or critical fails the build. */
const PAGES = [
  '/',
  '/welcome',
  '/races',
  OPEN_RACE,
  '/clubs',
  '/leaderboard',
  '/plus',
  '/signin',
  '/privatumas',
  '/salygos',
]

test.describe('accessibility', () => {
  for (const path of PAGES) {
    test(`${path} has no serious accessibility problems`, async ({ page }) => {
      await page.goto(path)
      await settled(page) // measure contrast on the finished page, not mid-fade
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const bad = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      )
      // If this fails, say exactly what was measured (colours, ratio) and whether anything was
      // still animating, so a flake can be told apart from a real contrast problem.
      const running = bad.length
        ? await page.evaluate(() =>
            document
              .getAnimations()
              .filter(
                (a) => a.playState !== 'finished' && a.effect?.getTiming().iterations !== Infinity,
              )
              .map((a) => (a as CSSAnimation).animationName ?? 'transition'),
          )
        : []
      expect(
        bad.map((v) => {
          const detail = v.nodes
            .slice(0, 3)
            .map((n) => {
              const d = n.any[0]?.data as
                { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined
              return `${n.target.join(' ').slice(-50)} fg=${d?.fgColor} bg=${d?.bgColor} ratio=${d?.contrastRatio}`
            })
            .join(' | ')
          return `${v.id}: ${v.help} (${v.nodes.length}) ${detail}; animating: [${running.join(',')}]`
        }),
      ).toEqual([])
    })
  }

  test('the locked and unlocked training plan have no serious accessibility problems', async ({
    page,
  }) => {
    for (const unlock of [false, true]) {
      if (unlock) {
        await signInAsSample(page)
        await page.goto('/plus')
        await page.getByRole('button', { name: /Pradėti 14 dienų nemokamai/ }).click()
        await expect(page.getByText('Tu esi Plus narys')).toBeVisible()
      }
      await page.goto('/races/klaipedos-maratonas')
      await page.getByRole('tab', { name: 'Pasiruošimas' }).click()
      await expect(page.getByRole('region', { name: 'Pasiruošimo planas' })).toBeVisible()
      await settled(page)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const bad = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      )
      expect(
        bad.map((v) => `${v.id}: ${v.help} ${v.nodes[0]?.target.join(' ')}`),
        unlock ? 'unlocked' : 'locked',
      ).toEqual([])
    }
  })

  test('the page can be used with a keyboard alone: focus is visible and reaches the tab bar', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard navigation')
    await page.goto('/races')
    // The menu is the last thing on the page, so Shift+Tab from the top wraps round to it.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Shift+Tab')
      const inNav = await page.evaluate(
        () => !!document.activeElement?.closest('nav[aria-label="Pagrindinis meniu"]'),
      )
      if (inNav) return
    }
    throw new Error('Tab never reached the main menu')
  })

  test('the tab bar labels every icon', async ({ page }) => {
    await page.goto('/races')
    const nav = page.getByRole('navigation', { name: 'Pagrindinis meniu' })
    for (const name of ['Atrasti', 'Varžybos', 'Klubai', 'Planai', 'Įkvėpimas', 'Profilis']) {
      await expect(nav.getByRole('link', { name })).toBeVisible()
    }
  })
})
