import { addDays, type SlotSummary, type UserSlot, type UserSummary } from '@pacemates/shared'
import { isPast } from '../../lib/format'
import { weekStart } from '../inspire/progress'

/*
 * Progress numbers, worked out from the PaceMates workouts someone took part in that have
 * finished (cancelled ones don't count). Same rule as badges, so the two never disagree.
 */

export const STAT_WEEKS = 12

export interface WeekStat {
  /** Monday, ISO date. */
  start: string
  workouts: number
  km: number
}

export interface Partner {
  user: UserSummary
  /** Finished workouts together. */
  together: number
}

export interface Stats {
  /** Oldest first, ending with the current week. */
  weeks: WeekStat[]
  totalKm: number
  totalWorkouts: number
  /** Consecutive weeks with at least one workout, counted back from this week (or last, if this one is still empty). */
  streakWeeks: number
  /** Longest single workout in the period, if any. */
  longest: SlotSummary | null
  /** Share of kilometres by sport group, biggest first. */
  sports: { label: 'Bėgimas' | 'Dviratis' | 'Kita'; km: number; share: number }[]
  partners: Partner[]
  bestWeek: WeekStat | null
}

const sportGroup = (s: SlotSummary): 'Bėgimas' | 'Dviratis' | 'Kita' =>
  ['RUN', 'TRACK', 'TRAIL'].includes(s.sportType)
    ? 'Bėgimas'
    : ['CYCLING', 'GRAVEL'].includes(s.sportType)
      ? 'Dviratis'
      : 'Kita'

const round1 = (n: number) => Math.round(n * 10) / 10

export function computeStats(
  items: UserSlot[],
  today: string,
  myId: string,
  now = new Date(),
): Stats {
  const done = items.filter(
    ({ slot }) =>
      slot.status !== 'CANCELLED' && isPast(slot.date, slot.startTime, slot.endTime, now),
  )
  const thisWeek = weekStart(today)
  const firstWeek = addDays(thisWeek, -7 * (STAT_WEEKS - 1))

  const weeks: WeekStat[] = Array.from({ length: STAT_WEEKS }, (_, i) => ({
    start: addDays(firstWeek, i * 7),
    workouts: 0,
    km: 0,
  }))
  const inPeriod = done.filter(({ slot }) => slot.date >= firstWeek)
  for (const { slot } of inPeriod) {
    const week =
      weeks[
        Math.floor((Date.parse(weekStart(slot.date)) - Date.parse(firstWeek)) / (7 * 86_400_000))
      ]
    if (!week) continue
    week.workouts += 1
    week.km += slot.distanceKm
  }
  for (const w of weeks) w.km = round1(w.km)

  // Streak: back from this week, or from last week while this one hasn't had a workout yet.
  let end = weeks.length - 1
  if (weeks[end]!.workouts === 0) end -= 1
  let streak = 0
  for (let i = end; i >= 0 && weeks[i]!.workouts > 0; i--) streak += 1

  const totalKm = round1(inPeriod.reduce((sum, { slot }) => sum + slot.distanceKm, 0))
  const longest = inPeriod.reduce<SlotSummary | null>(
    (best, { slot }) => (!best || slot.distanceKm > best.distanceKm ? slot : best),
    null,
  )

  const byGroup = new Map<string, number>()
  for (const { slot } of inPeriod)
    byGroup.set(sportGroup(slot), (byGroup.get(sportGroup(slot)) ?? 0) + slot.distanceKm)
  const sports = [...byGroup.entries()]
    .map(([label, km]) => ({
      label: label as 'Bėgimas' | 'Dviratis' | 'Kita',
      km: round1(km),
      share: totalKm > 0 ? km / totalKm : 0,
    }))
    .sort((a, b) => b.km - a.km)

  // Who they trained with: the host and the first few people to join are what the list gives us.
  const together = new Map<string, Partner>()
  for (const { slot } of inPeriod) {
    for (const user of [slot.host, ...slot.participantPreview]) {
      if (user.id === myId) continue
      const entry = together.get(user.id) ?? { user, together: 0 }
      entry.together += 1
      together.set(user.id, entry)
    }
  }
  const partners = [...together.values()]
    .filter((p) => p.together >= 2)
    .sort((a, b) => b.together - a.together || a.user.name.localeCompare(b.user.name, 'lt'))
    .slice(0, 5)

  const bestWeek = weeks.reduce<WeekStat | null>(
    (best, w) => (w.km > (best?.km ?? 0) ? w : best),
    null,
  )

  return {
    weeks,
    totalKm,
    totalWorkouts: inPeriod.length,
    streakWeeks: streak,
    longest,
    sports,
    partners,
    bestWeek,
  }
}
