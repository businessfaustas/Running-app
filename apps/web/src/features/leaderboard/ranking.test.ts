import type { LeaderboardEntry } from '@pacemates/shared'
import { describe, expect, it } from 'vitest'
import { periodRange, rank } from './ranking'

const entry = (
  name: string,
  runKm: number,
  rideKm = 0,
  workouts = 1,
  hosted = 0,
): LeaderboardEntry => ({
  user: { id: name, name, avatarUrl: null },
  runKm,
  rideKm,
  workouts,
  hosted,
})

describe('periodRange', () => {
  it('uses Monday–Sunday weeks', () => {
    // 2026-10-17 is a Saturday.
    expect(periodRange('week', '2026-10-17')).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
      label: 'spalio 12–18 d.',
    })
    expect(periodRange('week', '2026-10-18').from).toBe('2026-10-12')
    expect(periodRange('week', '2026-10-19').from).toBe('2026-10-19')
  })

  it('spells out last week across months', () => {
    expect(periodRange('lastWeek', '2026-10-01')).toEqual({
      from: '2026-09-21',
      to: '2026-09-27',
      label: 'rugsėjo 21–27 d.',
    })
    expect(periodRange('lastWeek', '2026-10-07').label).toBe('rugsėjo 28 – spalio 4 d.')
  })

  it('covers the whole calendar month', () => {
    expect(periodRange('month', '2026-02-10')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      label: 'Vasaris',
    })
  })
})

describe('rank', () => {
  const entries = [
    entry('Ieva', 30, 0, 3),
    entry('Tomas', 42, 0, 2),
    entry('Rūta', 0, 120, 2),
    entry('Mantas', 30, 0, 2),
  ]

  it('orders by the chosen total and leaves out people with none', () => {
    expect(rank(entries, 'run').map((r) => r.entry.user.name)).toEqual(['Tomas', 'Ieva', 'Mantas'])
    expect(rank(entries, 'ride').map((r) => r.entry.user.name)).toEqual(['Rūta'])
  })

  it('shares a place on equal totals', () => {
    expect(rank(entries, 'run').map((r) => r.rank)).toEqual([1, 2, 2])
    expect(rank(entries, 'workouts').map((r) => [r.entry.user.name, r.rank])).toEqual([
      ['Ieva', 1],
      ['Mantas', 2],
      ['Rūta', 2],
      ['Tomas', 2],
    ])
  })
})
