import { expect, signInAsSample, settled, test } from './fixtures'

/** The free app and the paid extras: what's open, what's locked, and what buying changes. */
const RACE = '/races/klaipedos-maratonas' // no confirmed date: its plan always exists, whatever today is

async function openPrep(page: import('@playwright/test').Page) {
  await page.goto(RACE)
  await page.getByRole('tab', { name: 'Pasiruošimas' }).click()
  await expect(page.getByRole('region', { name: 'Pasiruošimo planas' })).toBeVisible()
}

test.describe('PaceMates Plus', () => {
  test('the pricing page is public and states the offer plainly @live', async ({
    page,
    errors,
  }) => {
    await page.goto('/plus')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Treniruokis link tikslo')
    // Yearly is selected first; both prices and the trial are spelled out.
    await expect(page.getByText('29,99 €').first()).toBeVisible()
    await page.getByRole('button', { name: 'Kas mėnesį' }).click()
    await expect(page.getByText('3,99 €').first()).toBeVisible()
    await expect(page.getByText(/Pirmos 14 dienų nemokamos/)).toBeVisible()
    await expect(page.getByText('Visada nemokama')).toBeVisible()
    await expect(page.getByText(/Varžybų leidimas – 6,99 €/)).toBeVisible()
    await expect(page.getByText(/Atšaukti galima bet kada/).first()).toBeVisible()
    expect(errors).toEqual([])
  })

  test('answers the questions people have before paying', async ({ page }) => {
    await page.goto('/plus')
    await page.getByText('Ar PaceMates lieka nemokama?').click()
    await expect(page.getByText(/ir tokia liks/)).toBeVisible()
  })

  test('someone not signed in is sent to sign in, then back', async ({ page }) => {
    await page.goto('/plus')
    await page.getByRole('button', { name: /Pradėti 14 dienų nemokamai/ }).click()
    await expect(page).toHaveURL(/signin\?next=%2Fplus/)
  })

  test('a free account sees week 1 of a plan and the rest locked, with a way to unlock', async ({
    page,
  }) => {
    await signInAsSample(page)
    await openPrep(page)
    const plan = page.getByRole('region', { name: 'Pasiruošimo planas' })
    await expect(plan.getByText(/savaičių/).first()).toBeVisible()
    // Week 1's sessions are readable…
    await expect(plan.getByText('Ilgasis').first()).toBeVisible()
    // …later weeks only show their shape, with a lock.
    expect(await plan.getByRole('img', { name: /Užrakinta/ }).count()).toBeGreaterThan(5)
    await expect(plan.getByRole('link', { name: /Išbandyk Plus 14 d\. nemokamai/ })).toBeVisible()
    await expect(plan.getByRole('button', { name: /Tik šie startai – 6,99 €/ })).toBeVisible()
  })

  test('a race pass unlocks that race only', async ({ page }) => {
    await signInAsSample(page)
    await openPrep(page)
    await page.getByRole('button', { name: /Tik šie startai – 6,99 €/ }).click()
    const plan = page.getByRole('region', { name: 'Pasiruošimo planas' })
    await expect(plan.getByRole('img', { name: /Užrakinta/ })).toHaveCount(0)
    await expect(plan.getByText('Leidimas')).toBeVisible()
    // Another race is still locked.
    await page.goto('/races/vilties-begimas')
    await page.getByRole('tab', { name: 'Pasiruošimas' }).click()
    expect(
      await page
        .getByRole('region', { name: 'Pasiruošimo planas' })
        .getByRole('img', { name: /Užrakinta/ })
        .count(),
    ).toBeGreaterThan(5)
  })

  test('triathlons say honestly that there is no plan yet', async ({ page }) => {
    await page.goto('/races')
    await page.getByRole('button', { name: /Triatlonas/ }).click()
    await page.locator('a[href^="/races/"]').first().click()
    await page.getByRole('tab', { name: 'Pasiruošimas' }).click()
    await expect(page.getByText(/Triatlono planų kol kas neturime/)).toBeVisible()
  })

  test('subscribing (pretend, in preview mode) unlocks everything, shows the badge, and can be cancelled', async ({
    page,
  }) => {
    await signInAsSample(page)
    await page.goto('/plus')
    await page.getByRole('button', { name: /Pradėti 14 dienų nemokamai/ }).click()
    await expect(page.getByText('Tu esi Plus narys')).toBeVisible()
    await expect(page.getByText(/Bandomasis laikotarpis iki/)).toBeVisible()

    // Full plan everywhere.
    await openPrep(page)
    await expect(
      page
        .getByRole('region', { name: 'Pasiruošimo planas' })
        .getByRole('img', { name: /Užrakinta/ }),
    ).toHaveCount(0)

    // The badge on the profile.
    await page.goto('/profile')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('span', { hasText: /^Plus$/ }).first()).toBeVisible()

    // Cancelling is one tap in Settings and keeps access until the period ends.
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Atšaukti prenumeratą' }).click()
    await expect(page.getByText(/Atšaukta – .*veikia iki.*Nieko nenuskaitysime/)).toBeVisible()
  })

  test('statistics: a free account sees this week and an invitation; Plus sees the full picture', async ({
    page,
  }) => {
    await signInAsSample(page)
    await page.goto('/stats')
    await expect(page.getByText('Km šią savaitę')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Matyk visą savo pažangą' })).toBeVisible()
    await expect(page.getByText('Kilometrai per savaitę')).toHaveCount(0)

    await page.goto('/plus')
    await page.getByRole('button', { name: /Pradėti 14 dienų nemokamai/ }).click()
    await expect(page.getByText('Tu esi Plus narys')).toBeVisible()
    await page.goto('/stats')
    await expect(page.getByRole('heading', { name: 'Kilometrai per savaitę' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Į kalendorių' })).toBeVisible()
  })

  test('Plus members can download their upcoming workouts as a calendar file', async ({ page }) => {
    await signInAsSample(page)
    await page.goto('/plus')
    await page.getByRole('button', { name: /Pradėti 14 dienų nemokamai/ }).click()
    await expect(page.getByText('Tu esi Plus narys')).toBeVisible()
    await page.goto('/stats')
    await settled(page)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Atsisiųsti \.ics failą/ }).click(),
    ])
    expect(download.suggestedFilename()).toBe('pacemates-treniruotes.ics')
    const path = await download.path()
    const text = (await import('node:fs')).readFileSync(path, 'utf8')
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(text).toContain('BEGIN:VEVENT')
  })

  test('the core app stays free: joining and posting work without any plan', async ({ page }) => {
    await signInAsSample(page)
    await page.goto('/workouts/new')
    await expect(page.getByRole('heading', { name: 'Ką veiksi?' })).toBeVisible()
    await page.goto('/workouts/b0000000-0000-4000-8000-000000000012')
    await expect(page.getByRole('button', { name: 'Dalyvausiu' })).toBeVisible()
  })

  test('the paywall is not in the way of reading the terms or the legal pages', async ({
    page,
  }) => {
    await page.goto('/salygos')
    await expect(
      page.getByRole('heading', { name: '8. Mokami planai (PaceMates Plus)' }),
    ).toBeVisible()
    await expect(page.getByText(/PaceMates naudoti nemokama/)).toBeVisible()
    await page.goto('/privatumas')
    await expect(page.getByText(/Stripe Payments Europe/)).toBeVisible()
  })
})
