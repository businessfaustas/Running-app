import type { Race } from '@pacemates/shared'
import { describe, expect, it } from 'vitest'
import { countdown, monthHeading, raceWhen } from './dates'

const race = (date: string | null, typicalMonth: number): Race => ({
  slug: 'test-race',
  name: 'Test',
  date,
  typicalMonth,
  city: 'Vilnius',
  region: 'Vilniaus apskr.',
  start: { lat: 54.68, lng: 25.28 },
  type: 'ROAD',
  distances: [10],
  surface: ['asphalt'],
  elevationGainM: null,
  website: null,
  description: '',
  tips: [],
})

describe('raceWhen', () => {
  const today = '2026-10-15'

  it('counts down to a confirmed upcoming date', () => {
    const when = raceWhen(race('2026-10-25', 10), today)
    expect(when).toMatchObject({ sortDate: '2026-10-25', confirmed: true, daysUntil: 10 })
    expect(when.label).toContain('spalio 25')
  })

  it('places an unannounced race in its usual month, this year or next', () => {
    expect(raceWhen(race(null, 11), today)).toMatchObject({
      sortDate: '2026-11-15',
      label: '~ lapkritis 2026',
      confirmed: false,
    })
    expect(raceWhen(race(null, 5), today).sortDate).toBe('2027-05-15')
    expect(raceWhen(race(null, 10), today).sortDate).toBe('2026-10-15')
  })

  it('rolls a finished edition on to next year', () => {
    const when = raceWhen(race('2026-10-03', 10), today)
    expect(when).toMatchObject({ sortDate: '2027-10-15', confirmed: false, lastDate: '2026-10-03' })
    // Even when the catalogue is more than a year out of date.
    expect(raceWhen(race('2024-06-01', 6), today).sortDate).toBe('2027-06-15')
  })
})

describe('labels', () => {
  it('formats headings and countdowns', () => {
    expect(monthHeading('2027-05-15')).toBe('Gegužė 2027')
    expect(countdown(0)).toBe('Šiandien')
    expect(countdown(1)).toBe('Rytoj')
    expect(countdown(12)).toBe('Po 12 d.')
    expect(countdown(200)).toBeNull()
    expect(countdown(null)).toBeNull()
  })
})
