import { describe, expect, it } from 'vitest'
import {
  formatPrice,
  hasRaceAccess,
  NO_ENTITLEMENTS,
  parseEntitlements,
  PLUS_FAQ,
  PLUS_FEATURES,
  PRICES,
  TRIAL_DAYS,
  yearlyPerMonthCents,
  yearlySavingsPercent,
} from './plans'

describe('pricing', () => {
  it('keeps every price inside what a hobby athlete would call fair', () => {
    expect(PRICES.plusMonthCents).toBeLessThanOrEqual(499)
    expect(PRICES.plusYearCents).toBeLessThanOrEqual(3499)
    expect(PRICES.racePassCents).toBeLessThanOrEqual(799)
  })

  it('makes the yearly plan clearly cheaper than twelve months, and the race pass cheaper than a few months', () => {
    expect(yearlySavingsPercent()).toBeGreaterThanOrEqual(30)
    expect(yearlyPerMonthCents()).toBeLessThan(PRICES.plusMonthCents)
    // One race pass costs less than two months, so a single goal never pushes people into a subscription.
    expect(PRICES.racePassCents).toBeLessThan(PRICES.plusMonthCents * 2)
    // …but five or more goals a year are cheaper on the yearly plan (the FAQ says "five").
    expect(PRICES.racePassCents * 4).toBeLessThan(PRICES.plusYearCents)
    expect(PRICES.racePassCents * 5).toBeGreaterThan(PRICES.plusYearCents)
  })

  it('formats prices the Lithuanian way', () => {
    expect(formatPrice(399)).toBe('3,99 €')
    expect(formatPrice(2999)).toBe('29,99 €')
    expect(formatPrice(500)).toBe('5 €')
  })

  it('has a trial of a fortnight', () => {
    expect(TRIAL_DAYS).toBe(14)
  })
})

describe('entitlements', () => {
  it('gives nothing to people without a plan', () => {
    expect(hasRaceAccess(NO_ENTITLEMENTS, 'trail-kursiu-nerija')).toBe(false)
  })

  it('opens every race to Plus, and only the bought one to a race pass', () => {
    expect(hasRaceAccess({ ...NO_ENTITLEMENTS, plus: true }, 'any-race')).toBe(true)
    const pass = { ...NO_ENTITLEMENTS, racePasses: ['klaipedos-maratonas'] }
    expect(hasRaceAccess(pass, 'klaipedos-maratonas')).toBe(true)
    expect(hasRaceAccess(pass, 'vilties-begimas')).toBe(false)
  })
})

describe('the offer', () => {
  it('lists each paid feature with what stays free beside it', () => {
    expect(PLUS_FEATURES.map((f) => f.id)).toEqual(['race-plans', 'stats', 'calendar', 'badge'])
    for (const f of PLUS_FEATURES) {
      expect(f.blurb.length).toBeGreaterThan(30)
      expect(f.free.length).toBeGreaterThan(0)
    }
  })

  it('answers the questions people have before paying, and promises the app stays free', () => {
    expect(PLUS_FAQ.length).toBeGreaterThanOrEqual(4)
    expect(PLUS_FAQ[0]!.answer).toMatch(/nemokam/i)
    for (const { answer } of PLUS_FAQ) expect(answer).not.toMatch(/nmato/)
  })
})

describe('parseEntitlements', () => {
  it('reads what the server sends', () => {
    expect(
      parseEntitlements({
        plus: true,
        status: 'trialing',
        plan: 'plus_year',
        renewsAt: '2026-12-06T10:00:00Z',
        trialEndsAt: '2026-12-06T10:00:00Z',
        cancelAtPeriodEnd: false,
        racePasses: ['klaipedos-maratonas'],
      }),
    ).toEqual({
      plus: true,
      status: 'trialing',
      plan: 'plus_year',
      renewsAt: '2026-12-06T10:00:00Z',
      trialEndsAt: '2026-12-06T10:00:00Z',
      cancelAtPeriodEnd: false,
      racePasses: ['klaipedos-maratonas'],
    })
  })

  it('never unlocks anything from a missing, malformed or contradictory response', () => {
    for (const bad of [null, undefined, 'plus', 42, [], {}, { plus: 'true' }, { plus: 1 }]) {
      expect(parseEntitlements(bad).plus).toBe(false)
    }
    // Says plus, but with no real status: not trusted.
    expect(parseEntitlements({ plus: true, status: 'none' }).plus).toBe(false)
    expect(parseEntitlements({ plus: true, status: 'canceled' }).plus).toBe(false)
    expect(parseEntitlements({ plus: true, status: 'hacked' }).plus).toBe(false)
    expect(parseEntitlements({ racePasses: [1, null, 'a'] }).racePasses).toEqual(['a'])
    expect(parseEntitlements({ plan: 'free_forever' }).plan).toBeNull()
  })
})
