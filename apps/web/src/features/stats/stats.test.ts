import type { SlotSummary, UserSlot } from '@pacemates/shared'
import { describe, expect, it } from 'vitest'
import { computeStats, STAT_WEEKS } from './stats'

// Wednesday 25 Nov 2026, 12:00 Vilnius time.
const NOW = new Date('2026-11-25T10:00:00Z')
const TODAY = '2026-11-25'

const person = (id: string) => ({ id, name: `Vardas ${id}`, avatarUrl: null })
let n = 0
const item = (over: Partial<SlotSummary>, role: UserSlot['role'] = 'PARTICIPANT'): UserSlot => ({
  role,
  slot: {
    id: `s${n++}`,
    title: 'Bėgimas',
    sportType: 'RUN',
    date: '2026-11-20',
    startTime: '18:00',
    endTime: '19:00',
    distanceKm: 10,
    targetPace: '5:30',
    vibeTag: 'SOCIAL_CHAT',
    meetingPoint: { name: 'x', lat: 55.7, lng: 21.1 },
    maxParticipants: null,
    status: 'COMPLETED',
    host: person('h1'),
    participantCount: 3,
    participantPreview: [],
    ...over,
  },
})

describe('computeStats', () => {
  it('has twelve weeks ending with this one, each starting on a Monday', () => {
    const s = computeStats([], TODAY, 'me', NOW)
    expect(s.weeks).toHaveLength(STAT_WEEKS)
    expect(s.weeks.at(-1)!.start).toBe('2026-11-23')
    for (const w of s.weeks) expect(new Date(`${w.start}T12:00:00`).getDay()).toBe(1)
    expect(s.totalKm).toBe(0)
    expect(s.longest).toBeNull()
    expect(s.streakWeeks).toBe(0)
  })

  it('adds up finished workouts per week and ignores cancelled and upcoming ones', () => {
    const s = computeStats(
      [
        item({ date: '2026-11-24', distanceKm: 10 }), // this week, Tuesday, done
        item({ date: '2026-11-17', distanceKm: 8.5 }), // last week
        item({ date: '2026-11-18', distanceKm: 6.5 }), // last week
        item({ date: '2026-11-24', distanceKm: 99, status: 'CANCELLED' }),
        item({ date: '2026-11-28', distanceKm: 50 }), // Saturday: not happened yet
        item({ date: '2026-11-25', startTime: '18:00', endTime: '19:00', distanceKm: 40 }), // today, later
      ],
      TODAY,
      'me',
      NOW,
    )
    expect(s.weeks.at(-1)).toMatchObject({ workouts: 1, km: 10 })
    expect(s.weeks.at(-2)).toMatchObject({ workouts: 2, km: 15 })
    expect(s.totalKm).toBe(25)
    expect(s.totalWorkouts).toBe(3)
    expect(s.bestWeek!.km).toBe(15)
  })

  it('leaves out workouts older than the twelve weeks', () => {
    const s = computeStats([item({ date: '2026-08-01', distanceKm: 30 })], TODAY, 'me', NOW)
    expect(s.totalKm).toBe(0)
  })

  it('counts a streak of consecutive weeks, and does not lose it while this week is still empty', () => {
    const weekly = (dates: string[]) => dates.map((date) => item({ date }))
    const withThis = computeStats(
      weekly(['2026-11-24', '2026-11-17', '2026-11-10']),
      TODAY,
      'me',
      NOW,
    )
    expect(withThis.streakWeeks).toBe(3)
    const emptyThis = computeStats(weekly(['2026-11-17', '2026-11-10']), TODAY, 'me', NOW)
    expect(emptyThis.streakWeeks).toBe(2)
    const gap = computeStats(weekly(['2026-11-24', '2026-11-10']), TODAY, 'me', NOW)
    expect(gap.streakWeeks).toBe(1)
  })

  it('finds the longest workout and splits kilometres by sport, biggest first', () => {
    const s = computeStats(
      [
        item({ id: 'long', date: '2026-11-21', distanceKm: 28, sportType: 'RUN' }),
        item({ date: '2026-11-19', distanceKm: 60, sportType: 'CYCLING' }),
        item({ date: '2026-11-18', distanceKm: 12, sportType: 'TRAIL' }),
        item({ date: '2026-11-17', distanceKm: 2, sportType: 'SWIMMING' }),
      ],
      TODAY,
      'me',
      NOW,
    )
    expect(s.longest!.distanceKm).toBe(60)
    expect(s.sports.map((x) => x.label)).toEqual(['Dviratis', 'Bėgimas', 'Kita'])
    expect(s.sports[1]!.km).toBe(40)
    expect(s.sports.reduce((a, x) => a + x.share, 0)).toBeCloseTo(1)
  })

  it('names usual partners: two or more workouts together, never yourself', () => {
    const together = (date: string, others: string[]) =>
      item({ date, host: person('h1'), participantPreview: others.map(person) })
    const s = computeStats(
      [
        together('2026-11-20', ['me', 'p2']),
        together('2026-11-19', ['me', 'p2']),
        together('2026-11-18', ['p3']),
      ],
      TODAY,
      'me',
      NOW,
    )
    expect(s.partners.map((p) => [p.user.id, p.together])).toEqual([
      ['h1', 3],
      ['p2', 2],
    ])
  })
})
