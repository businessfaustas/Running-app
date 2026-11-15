import { expect, OPEN_RACE, OPEN_WORKOUT, PUBLIC_PAGES, signInAsSample, test } from './fixtures'

/** Smoke tests: the app starts, the main pages open, and the main journey works. */
test.describe('smoke', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} opens without errors @live`, async ({ page, errors }) => {
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)
      await expect(page.locator('#root')).not.toBeEmpty()
      await expect(page.getByRole('heading').first()).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test('opens on Klaipėda with today’s workouts @live', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Miestas: Klaipėda/ })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Šiandien')
  })

  test('shows a real 404 page for unknown addresses, hidden from search @live', async ({
    page,
  }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.getByRole('link', { name: /Atgal|pradži|Atrasti/i }).first()).toBeVisible()
  })

  test('shows a not-found state for a race that does not exist @live', async ({ page }) => {
    await page.goto('/races/not-a-race')
    await expect(page.getByText('Varžybų neradome')).toBeVisible()
  })

  test('search ignores diacritics ("kursiu" finds Kuršių) @live', async ({ page }) => {
    await page.goto('/races')
    await page.getByPlaceholder(/Varžybos, miestas/).fill('kursiu')
    await expect(page.getByText('Trail Kuršių Nerija').first()).toBeVisible()
  })

  test('a race page opens with its details @live', async ({ page, errors }) => {
    await page.goto(OPEN_RACE)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Kuršių')
    expect(errors).toEqual([])
  })

  test('sign-in, password reset and sign-up forms are there @live', async ({ page }) => {
    await page.goto('/signin')
    await expect(page.getByLabel('El. paštas')).toBeVisible()
    await expect(page.getByLabel('Slaptažodis').first()).toBeVisible()
    await page.getByRole('link', { name: /Pamiršai slaptažodį/ }).click()
    await expect(page).toHaveURL(/forgot-password/)
    await expect(page.getByLabel('El. paštas')).toBeVisible()
    await page.goto('/signin')
    await page.getByRole('tab', { name: 'Registruotis' }).click()
    await expect(page.getByLabel('El. paštas')).toBeVisible()
  })

  test('someone not signed in is sent to sign in before joining or posting @live', async ({
    page,
  }) => {
    await page.goto('/workouts/new')
    await expect(page).toHaveURL(/signin/)
  })

  test('main journey: sign in, join a workout, see the confirmation, open the chat', async ({
    page,
    errors,
  }) => {
    await signInAsSample(page)
    await page.goto(OPEN_WORKOUT)
    await page.getByRole('button', { name: 'Dalyvausiu' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Tu dalyvauji!' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Į pokalbį' }).click()
    await expect(page).toHaveURL(/\/chat$/)
    await page.getByPlaceholder('Rašyk grupei…').fill('Labas!')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Labas!')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('post a workout end to end', async ({ page }) => {
    await signInAsSample(page)
    await page.goto('/workouts/new')
    await expect(page.getByRole('heading', { name: 'Ką veiksi?' })).toBeVisible()
    await page.getByRole('button', { name: /Bėgimas/ }).click()
    await page.getByRole('button', { name: 'Toliau' }).click()
    await expect(page.getByText('2/6')).toBeVisible()
  })
})
