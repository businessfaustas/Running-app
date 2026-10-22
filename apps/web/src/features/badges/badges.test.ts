import type { SlotSummary, UserSlot } from '@pacemates/shared'
import { describe, expect, it } from 'vitest'
import { computeBadges } from './badges'

const NOW = new Date('2026-10-20T12:00:00')

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
  participantCount: 4,
  participantPreview: [],
  ...patch,
})
const as = (role: UserSlot['role'], patch: Partial<SlotSummary> = {}): UserSlot => ({
  role,
  slot: slot(patch),
})
const byId = (items: UserSlot[]) =>
  Object.fromEntries(computeBadges(items, NOW).map((b) => [b.id, b]))

describe('computeBadges', () => {
  it('starts with every medal locked', () => {
    const badges = computeBadges([], NOW)
    expect(badges).toHaveLength(12)
    expect(badges.every((b) => !b.earned && b.metal === 'locked')).toBe(true)
    expect(byId([]).team).toMatchObject({ label: '0/3', next: 'Dar 3 treniruotės iki Lv.1' })
  })

  it('counts only workouts that have finished', () => {
    const badges = byId([as('PARTICIPANT', { date: '2026-10-25' })])
    expect(badges.first?.earned).toBe(false)
    expect(byId([as('PARTICIPANT')]).first).toMatchObject({
      earned: true,
      label: '×1',
      metal: 'enamel',
    })
  })

  it('grows levels from bronze to silver to gold', () => {
    const workouts = (n: number) => Array.from({ length: n }, () => as('PARTICIPANT'))
    expect(byId(workouts(3)).team).toMatchObject({ level: 1, metal: 'bronze', label: 'Lv.1' })
    expect(byId(workouts(12)).team).toMatchObject({
      level: 2,
      metal: 'silver',
      next: 'Dar 13 treniruočių iki Lv.3',
    })
    expect(byId(workouts(25)).team).toMatchObject({
      level: 3,
      metal: 'gold',
      next: null,
      progress: 1,
    })
    // 25 × 10 km reaches the second distance step (200 km).
    expect(byId(workouts(25)).distance).toMatchObject({ level: 2, label: 'Lv.2' })
  })

  it('awards one-off feats and keeps personal records', () => {
    const badges = byId([
      as('HOST', { startTime: '06:15', endTime: '07:00', participantCount: 9 }),
      as('PARTICIPANT', {
        sportType: 'GRAVEL',
        startTime: '20:30',
        endTime: '22:00',
        distanceKm: 45,
      }),
      as('PARTICIPANT', { sportType: 'TRACK', distanceKm: 8 }),
      as('PARTICIPANT', { distanceKm: 21.1 }),
    ])
    for (const id of ['first', 'early', 'night', 'track', 'half']) {
      expect(badges[id]?.earned).toBe(true)
    }
    expect(badges.host).toMatchObject({ level: 1, metal: 'bronze' })
    expect(badges.ride).toMatchObject({ level: 1 })
    expect(badges.longest).toMatchObject({ label: '45 km', metal: 'gold' })
    expect(badges.earliest?.label).toBe('06:15')
    expect(badges.crowd?.label).toBe('9 žm.')
  })

  it('ignores cancelled workouts', () => {
    expect(byId([as('HOST', { status: 'CANCELLED' })]).first?.earned).toBe(false)
  })
})
