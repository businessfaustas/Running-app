import type { SlotDetail } from '@pacemates/shared'
import { describe, expect, it } from 'vitest'
import { describeChanges } from './describeChanges'

const before: SlotDetail = {
  id: 's1',
  title: '15 km lengvai + kava',
  sportType: 'RUN',
  date: '2026-11-12',
  startTime: '10:00',
  endTime: '11:30',
  distanceKm: 15,
  targetPace: '5:15–5:30 /km',
  vibeTag: 'ZONE_2_COFFEE',
  meetingPoint: { name: 'Katedros aikštė', lat: 54.6858, lng: 25.2877 },
  maxParticipants: 6,
  status: 'OPEN',
  host: { id: 'h', name: 'Gabija', avatarUrl: null },
  participantCount: 3,
  participantPreview: [],
  description: 'Po to kava.',
  participants: [],
}

const input = {
  title: before.title,
  sportType: before.sportType,
  date: before.date,
  startTime: before.startTime,
  endTime: before.endTime,
  distanceKm: before.distanceKm,
  targetPace: before.targetPace,
  vibeTag: before.vibeTag,
  description: before.description,
  meetingPoint: before.meetingPoint,
  maxParticipants: before.maxParticipants,
}

describe('describeChanges', () => {
  it('finds nothing when nothing changed', () => {
    expect(describeChanges(before, input)).toEqual([])
  })

  it('lists what the group needs to know, in words', () => {
    expect(
      describeChanges(before, {
        ...input,
        startTime: '10:30',
        endTime: '12:00',
        distanceKm: 21.1,
        meetingPoint: { name: 'Vingio parkas', lat: 54.684, lng: 25.239 },
        maxParticipants: null,
        description: 'Kava Pilies gatvėje.',
      }),
    ).toEqual([
      'pradžia: ketvirtadienis, lapkričio 12 d., 10:30',
      'atstumas: 21,1 km',
      'vieta: Vingio parkas',
      'grupė: be apribojimų',
      'atnaujintos pastabos',
    ])
  })

  it('mentions a new end time only when the start stayed', () => {
    expect(describeChanges(before, { ...input, endTime: '12:00' })).toEqual(['pabaiga: 12:00'])
  })

  it('calls cycling speed a speed', () => {
    expect(
      describeChanges(before, { ...input, sportType: 'CYCLING', targetPace: '26–28 km/h' }),
    ).toEqual(['sportas: plentas', 'greitis: 26–28 km/h'])
  })
})
