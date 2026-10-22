import type { SlotSummary, UserSlot } from '@pacemates/shared'
import { describe, expect, it } from 'vitest'
import { paceFromTime, weekProgress, weekStart } from './progress'

const slot = (patch: Partial<SlotSummary>): SlotSummary => ({
  id: Math.random().toString(36),
  title: 'Bėgimas',
  sportType: 'RUN',
  date: '2026-10-13',
  startTime: '10:00',
  endTime: '11:00',
  distanceKm: 10,
  targetPace: '5:30 /km',
  vibeTag: 'SOCIAL_CHAT',
  meetingPoint: { name: 'Vingis', lat: 54.68, lng: 25.24 },
  maxParticipants: null,
  status: 'OPEN',
  host: { id: 'h', name: 'Host', avatarUrl: null },
  participantCount: 2,
  participantPreview: [],
  ...patch,
})
const as = (role: UserSlot['role'], patch: Partial<SlotSummary> = {}): UserSlot => ({
  role,
  slot: slot(patch),
})

describe('weekProgress', () => {
  it('finds the Monday of the week', () => {
    expect(weekStart('2026-10-13')).toBe('2026-10-12') // Tuesday → Monday
    expect(weekStart('2026-10-18')).toBe('2026-10-12') // Sunday → previous Monday
    expect(weekStart('2026-10-12')).toBe('2026-10-12')
  })

  it('counts this week only, without cancelled workouts', () => {
    const items = [
      as('HOST', { date: '2026-10-12', distanceKm: 10 }),
      as('PARTICIPANT', { date: '2026-10-18', distanceKm: 21.1 }),
      as('PARTICIPANT', { date: '2026-10-19', distanceKm: 5 }),
      as('PARTICIPANT', { date: '2026-10-14', distanceKm: 8, status: 'CANCELLED' }),
    ]
    expect(weekProgress(items, '2026-10-13')).toEqual({ workouts: 2, km: 31.1 })
  })
})

describe('paceFromTime', () => {
  it('turns a finish time into pace and speed', () => {
    expect(paceFromTime(10, 50 * 60)).toEqual({ pace: '5:00', speed: '12,0' })
    expect(paceFromTime(42.195, 3 * 3600 + 30 * 60)).toEqual({ pace: '4:59', speed: '12,1' })
  })

  it('needs a distance and a time', () => {
    expect(paceFromTime(0, 100)).toBeNull()
    expect(paceFromTime(5, 0)).toBeNull()
  })
})
