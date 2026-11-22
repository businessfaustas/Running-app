import { describe, expect, it } from 'vitest'
import { describePlan } from './planText'

const base = {
  plan: 'plus_month' as const,
  renewsAt: '2026-12-06T10:00:00Z',
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
}

describe('describePlan', () => {
  it('explains a trial and what follows it', () => {
    const text = describePlan({ ...base, status: 'trialing', trialEndsAt: '2026-12-06T10:00:00Z' })
    expect(text).toMatch(/Bandomasis laikotarpis iki .*gruodžio 6/)
    expect(text).toMatch(/mėnesinė prenumerata/)
  })

  it('never says "then you pay" once a trial is cancelled', () => {
    const text = describePlan({
      ...base,
      status: 'trialing',
      trialEndsAt: '2026-12-06T10:00:00Z',
      cancelAtPeriodEnd: true,
    })
    expect(text).toMatch(/Atšaukta/)
    expect(text).toMatch(/Nieko nenuskaitysime/)
    expect(text).not.toMatch(/tada/)
  })

  it('says a cancelled paid plan runs to the end of the period and no further', () => {
    const text = describePlan({ ...base, status: 'active', cancelAtPeriodEnd: true })
    expect(text).toMatch(/veikia iki .*gruodžio 6/)
    expect(text).toMatch(/nieko nenuskaitysime/)
  })

  it('shows the next payment for an active plan, in the right kind', () => {
    expect(describePlan({ ...base, status: 'active' })).toMatch(
      /^Mėnesinė prenumerata, kitas mokėjimas .*gruodžio 6/,
    )
    expect(describePlan({ ...base, plan: 'plus_year', status: 'active' })).toMatch(/^Metinė/)
  })

  it('tells people when a payment failed, while access continues', () => {
    expect(describePlan({ ...base, status: 'past_due' })).toMatch(/Nepavyko nuskaityti mokėjimo/)
  })
})
