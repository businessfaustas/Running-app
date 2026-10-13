import { addDays, fromISODate, timeToMinutes, type UserSlot } from '@pacemates/shared'

export type BadgeId =
  | 'first'
  | 'host'
  | 'early'
  | 'night'
  | 'long'
  | 'ride'
  | 'track'
  | 'regular'

export interface Badge {
  id: BadgeId
  title: string
  description: string
  current: number
  target: number
  earned: boolean
}

const DEFINITIONS: { id: BadgeId; title: string; description: string; target: number }[] = [
  { id: 'first', title: 'Pirmas žingsnis', description: 'Prisijunk prie pirmos treniruotės', target: 1 },
  { id: 'host', title: 'Organizatorius', description: 'Pakviesk kitus į savo treniruotę', target: 1 },
  { id: 'early', title: 'Ankstyvas paukštis', description: 'Treniruotė prieš 7:00', target: 1 },
  { id: 'night', title: 'Nakties pelėda', description: 'Treniruotė po 20:00', target: 1 },
  { id: 'long', title: 'Ilgoji distancija', description: 'Treniruotė nuo 21 km', target: 1 },
  { id: 'ride', title: 'Ant dviejų ratų', description: 'Važiuok su grupe dviračiu', target: 1 },
  { id: 'track', title: 'Stadiono žvaigždė', description: 'Treniruotė stadione', target: 1 },
  { id: 'regular', title: 'Komandos žmogus', description: '5 bendros treniruotės', target: 5 },
]

/** Achievements from the workouts someone hosted or joined (cancelled ones don't count). */
export function computeBadges(items: UserSlot[]): Badge[] {
  const slots = items.filter(({ slot }) => slot.status !== 'CANCELLED')
  const count = (test: (item: UserSlot) => boolean) => slots.filter(test).length
  const counts: Record<BadgeId, number> = {
    first: slots.length,
    host: count(({ role }) => role === 'HOST'),
    early: count(({ slot }) => timeToMinutes(slot.startTime) < 7 * 60),
    night: count(({ slot }) => timeToMinutes(slot.startTime) >= 20 * 60),
    long: count(({ slot }) => slot.distanceKm >= 21),
    ride: count(({ slot }) => slot.sportType === 'CYCLING' || slot.sportType === 'GRAVEL'),
    track: count(({ slot }) => slot.sportType === 'TRACK'),
    regular: slots.length,
  }
  return DEFINITIONS.map((d) => {
    const current = Math.min(counts[d.id], d.target)
    return { ...d, current, earned: current >= d.target }
  })
}

/** Monday of the week `date` falls in. */
export function weekStart(date: string): string {
  const day = fromISODate(date).getDay() // 0 = Sunday
  return addDays(date, day === 0 ? -6 : 1 - day)
}

/** Workouts and kilometres planned in the current Monday–Sunday week. */
export function weekProgress(items: UserSlot[], today: string) {
  const from = weekStart(today)
  const to = addDays(from, 6)
  const week = items.filter(
    ({ slot }) => slot.status !== 'CANCELLED' && slot.date >= from && slot.date <= to,
  )
  return {
    workouts: week.length,
    km: Math.round(week.reduce((sum, { slot }) => sum + slot.distanceKm, 0) * 10) / 10,
  }
}

/** Pace (min/km) and speed (km/h) for covering `km` in `seconds`. */
export function paceFromTime(km: number, seconds: number): { pace: string; speed: string } | null {
  if (!(km > 0) || !(seconds > 0)) return null
  const perKm = Math.round(seconds / km)
  const minutes = Math.floor(perKm / 60)
  const pace = `${minutes}:${String(perKm % 60).padStart(2, '0')}`
  const speed = ((km / seconds) * 3600).toFixed(1).replace('.', ',')
  return { pace, speed }
}
