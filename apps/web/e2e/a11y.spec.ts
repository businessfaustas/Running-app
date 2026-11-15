import AxeBuilder from '@axe-core/playwright'
import { expect, OPEN_RACE, test } from './fixtures'

/** Accessibility: automated WCAG 2.1 A/AA checks. Anything serious or critical fails the build. */
const PAGES = [
  '/',
  '/welcome',
  '/races',
  OPEN_RACE,
  '/clubs',
  '/leaderboard',
  '/signin',
  '/privatumas',
  '/salygos',
]

test.describe('accessibility', () => {
  for (const path of PAGES) {
    test(`${path} has no serious accessibility problems`, async ({ page }) => {
      await page.goto(path)
      await page.waitForTimeout(700) // let entrance animations settle before measuring contrast
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const bad = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      )
      expect(
        bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`),
      ).toEqual([])
    })
  }

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
