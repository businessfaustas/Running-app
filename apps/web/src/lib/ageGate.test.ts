import { describe, expect, it } from 'vitest'
import { MIN_AGE } from '../content/legal'
import { ageInYears, birthYears, oldEnough } from './ageGate'

const NOW = new Date(2026, 10, 1) // 1 November 2026

describe('age gate', () => {
  it('counts full years from the year and month of birth', () => {
    expect(ageInYears(2010, 11, NOW)).toBe(16)
    expect(ageInYears(2010, 12, NOW)).toBe(15)
    expect(ageInYears(1990, 1, NOW)).toBe(36)
  })

  it(`lets people in from ${MIN_AGE}`, () => {
    expect(oldEnough(2026 - MIN_AGE, 11, NOW)).toBe(true)
    expect(oldEnough(2026 - MIN_AGE, 12, NOW)).toBe(false)
    expect(oldEnough(2014, 1, NOW)).toBe(false)
  })

  it('offers a plain list of years that includes children (a neutral question)', () => {
    const years = birthYears(NOW)
    expect(years[0]).toBe(2026)
    expect(years).toContain(2015)
    expect(years).toContain(1930)
  })
})
