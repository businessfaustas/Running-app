import { timeToMinutes, type UserSlot } from '@pacemates/shared'
import { countOf, formatKm, isPast, WORDS } from '../../lib/format'

/*
 * Achievements, worked out from the PaceMates workouts someone took part in that have
 * finished (cancelled ones don't count). Three kinds, each with its own medal:
 *  - levels: grow from bronze to silver to gold as a total goes up;
 *  - achievements: one-off feats, with how many times they've been done;
 *  - records: personal bests, showing the best value so far.
 */

export type BadgeKind = 'level' | 'achievement' | 'record'
export type Metal = 'bronze' | 'silver' | 'gold' | 'enamel' | 'locked'

export type BadgeId =
  | 'team'
  | 'host'
  | 'distance'
  | 'ride'
  | 'first'
  | 'early'
  | 'night'
  | 'track'
  | 'half'
  | 'longest'
  | 'earliest'
  | 'crowd'

export interface Badge {
  id: BadgeId
  kind: BadgeKind
  title: string
  /** What it's for, in a short sentence. */
  description: string
  earned: boolean
  /** Levels: 1–3 once earned, 0 before. */
  level: number
  metal: Metal
  /** The pill under the medal: "Lv.2", "3", "21 km", "06:15". */
  label: string
  /** Towards the next step (first level, next level), 0–1; 1 when complete. */
  progress: number
  /** "Dar 4 treniruotės iki Lv.2" – null when there's nothing left to reach. */
  next: string | null
}

const LEVEL_METALS: Metal[] = ['locked', 'bronze', 'silver', 'gold']

interface LevelDef {
  id: BadgeId
  title: string
  description: string
  steps: [number, number, number]
  unit: (n: number) => string
  measure: (done: UserSlot[]) => number
}

const isRide = ({ slot }: UserSlot) => slot.sportType === 'CYCLING' || slot.sportType === 'GRAVEL'

const LEVELS: LevelDef[] = [
  {
    id: 'team',
    title: 'Komandos žmogus',
    description: 'Bendros treniruotės su kitais',
    steps: [3, 10, 25],
    unit: (n) => countOf(n, WORDS.workout),
    measure: (done) => done.length,
  },
  {
    id: 'host',
    title: 'Organizatorius',
    description: 'Treniruotės, kurias organizavai',
    steps: [1, 5, 15],
    unit: (n) => countOf(n, WORDS.workout),
    measure: (done) => done.filter(({ role }) => role === 'HOST').length,
  },
  {
    id: 'distance',
    title: 'Kilometrų rinkėjas',
    description: 'Kilometrai grupinėse treniruotėse',
    steps: [50, 200, 500],
    unit: (n) => `${formatKm(n)} km`,
    measure: (done) => done.reduce((sum, { slot }) => sum + slot.distanceKm, 0),
  },
  {
    id: 'ride',
    title: 'Ant dviejų ratų',
    description: 'Važiavimai dviračiu su grupe',
    steps: [1, 5, 15],
    unit: (n) => countOf(n, WORDS.ride),
    measure: (done) => done.filter(isRide).length,
  },
]

interface AchievementDef {
  id: BadgeId
  title: string
  description: string
  test: (item: UserSlot) => boolean
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first',
    title: 'Pirmas žingsnis',
    description: 'Pirma treniruotė su PaceMates',
    test: () => true,
  },
  {
    id: 'early',
    title: 'Ankstyvas paukštis',
    description: 'Treniruotė, prasidėjusi prieš 7:00',
    test: ({ slot }) => timeToMinutes(slot.startTime) < 7 * 60,
  },
  {
    id: 'night',
    title: 'Nakties pelėda',
    description: 'Treniruotė, prasidėjusi po 20:00',
    test: ({ slot }) => timeToMinutes(slot.startTime) >= 20 * 60,
  },
  {
    id: 'track',
    title: 'Stadiono žvaigždė',
    description: 'Treniruotė stadione',
    test: ({ slot }) => slot.sportType === 'TRACK',
  },
  {
    id: 'half',
    title: 'Ilgoji distancija',
    description: 'Bėgimas nuo 21 km',
    test: ({ slot }) => slot.sportType === 'RUN' && slot.distanceKm >= 21,
  },
]

/** Every badge, finished workouts only. `now` decides what has finished. */
export function computeBadges(items: UserSlot[], now = new Date()): Badge[] {
  const done = items.filter(
    ({ slot }) =>
      slot.status !== 'CANCELLED' && isPast(slot.date, slot.startTime, slot.endTime, now),
  )

  const levels = LEVELS.map((def): Badge => {
    const value = def.measure(done)
    const level = def.steps.filter((step) => value >= step).length
    const nextStep = def.steps[level]
    const previousStep = level > 0 ? def.steps[level - 1]! : 0
    return {
      id: def.id,
      kind: 'level',
      title: def.title,
      description: def.description,
      earned: level > 0,
      level,
      metal: LEVEL_METALS[level]!,
      label: level > 0 ? `Lv.${level}` : `${formatKm(value)}/${formatKm(def.steps[0])}`,
      progress:
        nextStep === undefined
          ? 1
          : Math.min(1, (value - previousStep) / (nextStep - previousStep)),
      next:
        nextStep === undefined
          ? null
          : `Dar ${def.unit(Math.max(0, Math.ceil((nextStep - value) * 10) / 10))} iki Lv.${level + 1}`,
    }
  })

  const achievements = ACHIEVEMENTS.map((def): Badge => {
    const count = done.filter(def.test).length
    return {
      id: def.id,
      kind: 'achievement',
      title: def.title,
      description: def.description,
      earned: count > 0,
      level: 0,
      metal: count > 0 ? 'enamel' : 'locked',
      label: count > 0 ? `×${count}` : '0/1',
      progress: count > 0 ? 1 : 0,
      next: count > 0 ? null : def.description,
    }
  })

  const longest = Math.max(0, ...done.map(({ slot }) => slot.distanceKm))
  const earliest = Math.min(Infinity, ...done.map(({ slot }) => timeToMinutes(slot.startTime)))
  const crowd = Math.max(0, ...done.map(({ slot }) => slot.participantCount))
  const record = (
    id: BadgeId,
    title: string,
    description: string,
    value: string | null,
  ): Badge => ({
    id,
    kind: 'record',
    title,
    description,
    earned: value !== null,
    level: 0,
    metal: value !== null ? 'gold' : 'locked',
    label: value ?? '–',
    progress: value !== null ? 1 : 0,
    next: value !== null ? null : 'Atsiras po pirmos treniruotės',
  })
  const clock = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  const records = [
    record(
      'longest',
      'Ilgiausia treniruotė',
      'Tavo ilgiausia grupinė distancija',
      done.length ? `${formatKm(longest)} km` : null,
    ),
    record(
      'earliest',
      'Anksčiausias startas',
      'Anksčiausiai prasidėjusi treniruotė',
      done.length ? clock(earliest) : null,
    ),
    record(
      'crowd',
      'Didžiausia grupė',
      'Daugiausiai dalyvių vienoje treniruotėje',
      done.length ? `${crowd} žm.` : null,
    ),
  ]

  return [...levels, ...achievements, ...records]
}

export const BADGE_CATEGORIES: { id: BadgeKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Visi' },
  { id: 'level', label: 'Lygiai' },
  { id: 'achievement', label: 'Pasiekimai' },
  { id: 'record', label: 'Rekordai' },
]

const SHINE: Record<Metal, number> = { gold: 4, silver: 3, enamel: 2, bronze: 1, locked: 0 }

/** Earned medals, shiniest first, then the ones closest to being earned – for previews. */
export function showcase(badges: Badge[], count: number): Badge[] {
  return [
    ...badges.filter((b) => b.earned).sort((a, b) => SHINE[b.metal] - SHINE[a.metal]),
    ...badges.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress),
  ].slice(0, count)
}
