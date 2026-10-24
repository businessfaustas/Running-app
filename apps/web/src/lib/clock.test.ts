import { describe, expect, it } from 'vitest'
import { awayFromLithuania, todayISO, wallClock } from './clock'
import { isPast, startsIn } from './format'

// 21:30 in Vilnius (EEST, UTC+3) is still 18:30 in London and already the next day in Tokyo.
const EVENING = new Date('2026-10-20T18:30:00Z')

describe('Lithuanian clock', () => {
  it('reads Vilnius wall-clock time whatever the device time zone', () => {
    const wall = wallClock(EVENING)
    expect([wall.getHours(), wall.getMinutes()]).toEqual([21, 30])
    expect(todayISO(new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-21')
  })

  it('follows daylight saving time', () => {
    // Winter: UTC+2.
    expect(wallClock(new Date('2026-12-01T10:00:00Z')).getHours()).toBe(12)
  })

  it('decides whether a workout has finished in Lithuanian time', () => {
    expect(isPast('2026-10-20', '20:00', '21:00', EVENING)).toBe(true)
    expect(isPast('2026-10-20', '21:00', '22:00', EVENING)).toBe(false)
    expect(startsIn('2026-10-20', '22:00', EVENING)).toBe('Po 30 min.')
  })

  it('notices when the device is not on Lithuanian time', () => {
    // Lithuania is UTC+3 that evening; getTimezoneOffset counts minutes the other way.
    expect(awayFromLithuania(EVENING)).toBe(EVENING.getTimezoneOffset() !== -180)
  })
})
