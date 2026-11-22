import { hasRaceAccess, NO_ENTITLEMENTS, TRIAL_DAYS } from '@pacemates/shared'
import { MOCK_USERS } from '@pacemates/shared/mock'
import { describe, expect, it } from 'vitest'
import { createDemoBackend } from './demo'
import { MESSAGES } from './messages'

const memoryStorage = () => {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const START = new Date('2026-11-23T09:00:00Z')

function setup(storage = memoryStorage()) {
  let now = START
  const backend = createDemoBackend({ storage, now: () => now, latencyMs: 0 })
  return {
    backend,
    storage,
    advanceDays: (d: number) => (now = new Date(now.getTime() + d * 86_400_000)),
  }
}

describe('demo plans', () => {
  it('gives nothing to someone signed out, and nothing to a new sign-in', async () => {
    const { backend } = setup()
    expect(await backend.getEntitlements()).toEqual(NO_ENTITLEMENTS)
    await backend.signInAsSample!()
    expect((await backend.getEntitlements()).plus).toBe(false)
  })

  it('starts a first subscription as a free trial that runs for the trial period', async () => {
    const { backend } = setup()
    await backend.signInAsSample!()
    expect(await backend.startCheckout({ kind: 'plus', plan: 'plus_month' })).toEqual({ url: null })
    const e = await backend.getEntitlements()
    expect(e).toMatchObject({
      plus: true,
      status: 'trialing',
      plan: 'plus_month',
      cancelAtPeriodEnd: false,
    })
    const days = (new Date(e.trialEndsAt!).getTime() - START.getTime()) / 86_400_000
    expect(days).toBe(TRIAL_DAYS)
  })

  it('refuses to buy what you already have', async () => {
    const { backend } = setup()
    await backend.signInAsSample!()
    await backend.startCheckout({ kind: 'plus', plan: 'plus_year' })
    await expect(backend.startCheckout({ kind: 'plus', plan: 'plus_month' })).rejects.toThrow(
      MESSAGES.alreadyHaveAccess,
    )
    await expect(
      backend.startCheckout({ kind: 'race_pass', raceSlug: 'vilties-begimas' }),
    ).rejects.toThrow(MESSAGES.alreadyHaveAccess)
  })

  it('needs a sign-in to buy', async () => {
    const { backend } = setup()
    await expect(backend.startCheckout({ kind: 'plus', plan: 'plus_month' })).rejects.toThrow(
      MESSAGES.signInFirst,
    )
  })

  it('keeps Plus until the paid period ends after cancelling, then stops – and a second go has no second trial', async () => {
    const { backend, advanceDays } = setup()
    await backend.signInAsSample!()
    await backend.startCheckout({ kind: 'plus', plan: 'plus_month' })
    await backend.demoCancelPlus!()
    expect(await backend.getEntitlements()).toMatchObject({ plus: true, cancelAtPeriodEnd: true })
    advanceDays(TRIAL_DAYS - 1)
    expect((await backend.getEntitlements()).plus).toBe(true)
    advanceDays(2)
    expect((await backend.getEntitlements()).plus).toBe(false)
    await backend.startCheckout({ kind: 'plus', plan: 'plus_month' })
    expect(await backend.getEntitlements()).toMatchObject({
      plus: true,
      status: 'active',
      trialEndsAt: null,
    })
  })

  it('sells a race pass that opens that race only', async () => {
    const { backend } = setup()
    await backend.signInAsSample!()
    await backend.startCheckout({ kind: 'race_pass', raceSlug: 'klaipedos-maratonas' })
    const e = await backend.getEntitlements()
    expect(e.plus).toBe(false)
    expect(hasRaceAccess(e, 'klaipedos-maratonas')).toBe(true)
    expect(hasRaceAccess(e, 'vilties-begimas')).toBe(false)
    await expect(
      backend.startCheckout({ kind: 'race_pass', raceSlug: 'klaipedos-maratonas' }),
    ).rejects.toThrow(MESSAGES.alreadyHaveAccess)
  })

  it('remembers plans between visits', async () => {
    const first = setup()
    await first.backend.signInAsSample!()
    await first.backend.startCheckout({ kind: 'plus', plan: 'plus_year' })
    const again = setup(first.storage)
    expect((await again.backend.getEntitlements()).plus).toBe(true)
  })

  it('shows the badge for Plus members, including the sample ones, and not for others', async () => {
    const { backend } = setup()
    await backend.signInAsSample!()
    const me = MOCK_USERS[0]!.id
    const ids = [me, MOCK_USERS[2]!.id, MOCK_USERS[3]!.id, MOCK_USERS[9]!.id]
    expect(await backend.listPlusMembers(ids)).toEqual([MOCK_USERS[2]!.id, MOCK_USERS[9]!.id])
    await backend.startCheckout({ kind: 'plus', plan: 'plus_month' })
    expect(await backend.listPlusMembers(ids)).toContain(me)
  })

  it('removes the plan with the account', async () => {
    const { backend } = setup()
    await backend.signUp({
      name: 'Nauja Narė',
      email: 'nare@example.com',
      password: 'slaptazodis1',
    })
    await backend.signIn({ email: 'nare@example.com', password: 'slaptazodis1' })
    await backend.startCheckout({ kind: 'plus', plan: 'plus_month' })
    expect((await backend.getEntitlements()).plus).toBe(true)
    await backend.deleteAccount()
    expect(await backend.getEntitlements()).toEqual(NO_ENTITLEMENTS)
  })
})
