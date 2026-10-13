import { describe, expect, it } from 'vitest'
import { paceFit, parsePace, parseSpeed, parseTarget } from './pace'

describe('parsing targets', () => {
  it('reads running pace ranges and single paces', () => {
    expect(parseTarget('5:15–5:30 /km')).toEqual({ kind: 'pace', min: 315, max: 330 })
    expect(parseTarget('6:00 /km')).toEqual({ kind: 'pace', min: 360, max: 360 })
    expect(parseTarget('4:10-4:20 /km reps')).toEqual({ kind: 'pace', min: 250, max: 260 })
  })

  it('reads riding speeds', () => {
    expect(parseTarget('24–26 km/h')).toEqual({ kind: 'speed', min: 24, max: 26 })
    expect(parseTarget('27 km/h')).toEqual({ kind: 'speed', min: 27, max: 27 })
    expect(parseTarget('27,5 km/h')).toEqual({ kind: 'speed', min: 27.5, max: 27.5 })
  })

  it('ignores targets that are not a pace', () => {
    expect(parseTarget('Hard up, jog down')).toBeNull()
    expect(parseTarget('1:25 per 400m')).toBeNull()
  })

  it('parses profile values', () => {
    expect(parsePace('5:30/km')).toBe(330)
    expect(parseSpeed('28 km/h')).toBe(28)
    expect(parsePace('fast')).toBeNull()
  })
})

describe('paceFit', () => {
  const easyRunner = { running_easy: '5:30/km', running_tempo: '4:50/km' }

  it('matches when the athlete sits inside the range (with a little slack)', () => {
    expect(paceFit('5:15–5:30 /km', 'RUN', 'ZONE_2_COFFEE', easyRunner)).toBe('match')
    expect(paceFit('5:35–5:45 /km', 'RUN', 'SOCIAL_CHAT', easyRunner)).toBe('match')
  })

  it('flags groups that are close, faster or easier', () => {
    expect(paceFit('5:50 /km', 'RUN', 'SOCIAL_CHAT', easyRunner)).toBe('close')
    expect(paceFit('4:30–4:45 /km', 'RUN', 'ZONE_2_COFFEE', easyRunner)).toBe('faster')
    expect(paceFit('6:30 /km', 'RUN', 'ZONE_2_COFFEE', easyRunner)).toBe('easier')
  })

  it('compares hard sessions against tempo pace', () => {
    expect(paceFit('4:45–4:55 /km', 'RUN', 'PACE_PUSH', easyRunner)).toBe('match')
  })

  it('compares rides against the usual speed', () => {
    expect(paceFit('30–32 km/h', 'CYCLING', 'PACE_PUSH', { cycling_avg: '31 km/h' })).toBe('match')
    expect(paceFit('30–32 km/h', 'CYCLING', 'PACE_PUSH', { cycling_avg: '26 km/h' })).toBe('faster')
    expect(paceFit('22–24 km/h', 'GRAVEL', 'SOCIAL_CHAT', { gravel_avg: '23 km/h' })).toBe('match')
  })

  it('returns null when either side is unknown', () => {
    expect(paceFit('Hard up, jog down', 'RUN', 'INTERVALS', easyRunner)).toBeNull()
    expect(paceFit('5:30 /km', 'RUN', 'SOCIAL_CHAT', {})).toBeNull()
    expect(paceFit('28 km/h', 'CYCLING', 'SOCIAL_CHAT', easyRunner)).toBeNull()
  })
})
