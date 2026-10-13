import type { DefaultPaces, SportType, VibeTag } from './domain'

/** Running paces are seconds per km; riding targets are km/h. */
export type TargetRange =
  { kind: 'pace'; min: number; max: number } | { kind: 'speed'; min: number; max: number }

const PACE_RE = /(\d{1,2}):([0-5]\d)/g
const SPEED_RE = /(\d+(?:[.,]\d+)?)\s*(?:[–-]\s*(\d+(?:[.,]\d+)?))?\s*km\/h/i

/** `"5:30/km"` → 330. Returns null when there's no `m:ss` in the text. */
export function parsePace(text: string): number | null {
  const match = /(\d{1,2}):([0-5]\d)/.exec(text)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** `"28 km/h"` → 28. */
export function parseSpeed(text: string): number | null {
  const match = SPEED_RE.exec(text)
  return match ? Number(match[1]!.replace(',', '.')) : null
}

/**
 * Reads a free-text target such as `"5:15–5:30 /km"`, `"6:00 /km"` or `"24–26 km/h"`.
 * Returns null for targets that aren't a pace or speed (e.g. "Hard up, jog down").
 */
export function parseTarget(text: string): TargetRange | null {
  const speed = SPEED_RE.exec(text)
  if (speed) {
    const a = Number(speed[1]!.replace(',', '.'))
    const b = speed[2] ? Number(speed[2].replace(',', '.')) : a
    return { kind: 'speed', min: Math.min(a, b), max: Math.max(a, b) }
  }
  if (!/\/\s*km/i.test(text)) return null
  const paces = [...text.matchAll(PACE_RE)].map((m) => Number(m[1]) * 60 + Number(m[2]))
  if (paces.length === 0) return null
  return { kind: 'pace', min: Math.min(...paces), max: Math.max(...paces) }
}

export type PaceFit = 'match' | 'close' | 'faster' | 'easier'

export const PACE_FIT_LABEL: Record<PaceFit, string> = {
  match: 'Your pace',
  close: 'Close to your pace',
  faster: 'Faster than usual',
  easier: 'Easier than usual',
}

const HARD_VIBES: VibeTag[] = ['PACE_PUSH', 'INTERVALS']

/** The athlete's usual pace or speed for this kind of workout, e.g. "5:30/km", if set. */
export function usualPace(sport: SportType, vibe: VibeTag, paces: DefaultPaces): string | null {
  if (sport === 'RUN' || sport === 'TRACK') {
    const hard = HARD_VIBES.includes(vibe)
    const pace = hard
      ? (paces.running_tempo ?? paces.running_easy)
      : (paces.running_easy ?? paces.running_tempo)
    return pace ?? null
  }
  return (sport === 'GRAVEL' ? (paces.gravel_avg ?? paces.cycling_avg) : paces.cycling_avg) ?? null
}

function referenceFor(sport: SportType, vibe: VibeTag, paces: DefaultPaces): TargetRange | null {
  const text = usualPace(sport, vibe, paces)
  if (!text) return null
  if (sport === 'RUN' || sport === 'TRACK') {
    const seconds = parsePace(text)
    return seconds === null ? null : { kind: 'pace', min: seconds, max: seconds }
  }
  const kmh = parseSpeed(text)
  return kmh === null ? null : { kind: 'speed', min: kmh, max: kmh }
}

/**
 * How a workout's target compares with an athlete's usual pace. Null when either side is
 * unknown. "faster"/"easier" describe the group relative to the athlete.
 */
export function paceFit(
  target: string,
  sport: SportType,
  vibe: VibeTag,
  paces: DefaultPaces,
): PaceFit | null {
  const range = parseTarget(target)
  const own = referenceFor(sport, vibe, paces)
  if (!range || !own || range.kind !== own.kind) return null
  const value = own.min

  if (range.kind === 'pace') {
    // Lower seconds per km = faster.
    if (value >= range.min - 10 && value <= range.max + 10) return 'match'
    if (value >= range.min - 25 && value <= range.max + 25) return 'close'
    return range.max < value ? 'faster' : 'easier'
  }
  if (value >= range.min - 1 && value <= range.max + 1) return 'match'
  if (value >= range.min - 3 && value <= range.max + 3) return 'close'
  return range.min > value ? 'faster' : 'easier'
}
