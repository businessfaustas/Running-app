import { describe, expect, it } from 'vitest'
import { addDays, minutesToTime, timeToMinutes, toISODate } from './time'

describe('time helpers', () => {
  it('converts between HH:mm and minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('10:30')).toBe(630)
    expect(timeToMinutes('17:45:00')).toBe(1065)
    expect(timeToMinutes('24:00')).toBe(1440)
    expect(minutesToTime(630)).toBe('10:30')
    expect(minutesToTime(5)).toBe('00:05')
  })

  it('rejects malformed times', () => {
    expect(() => timeToMinutes('noon')).toThrow()
  })

  it('formats local dates and adds days across month boundaries', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
