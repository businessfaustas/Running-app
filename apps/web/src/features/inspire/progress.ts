import { addDays, fromISODate, type UserSlot } from '@pacemates/shared'

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
