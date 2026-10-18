import { addDays, fromISODate, toISODate, type LeaderboardEntry } from '@pacemates/shared'
import { formatKm } from '../../lib/format'
import { weekStart } from '../inspire/progress'
import { MONTHS } from '../races/dates'

export type Period = 'week' | 'lastWeek' | 'month'
export type Metric = 'run' | 'ride' | 'workouts' | 'hosted'

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Ši savaitė' },
  { id: 'lastWeek', label: 'Praėjusi' },
  { id: 'month', label: 'Šis mėnuo' },
]

export const METRICS: { id: Metric; label: string; title: string }[] = [
  { id: 'run', label: 'Bėgimas', title: 'Daugiausiai nubėgę' },
  { id: 'ride', label: 'Dviratis', title: 'Daugiausiai numynę' },
  { id: 'workouts', label: 'Treniruotės', title: 'Dažniausiai sportavę' },
  { id: 'hosted', label: 'Organizatoriai', title: 'Daugiausiai organizavę' },
]

const MONTHS_GENITIVE = [
  'sausio',
  'vasario',
  'kovo',
  'balandžio',
  'gegužės',
  'birželio',
  'liepos',
  'rugpjūčio',
  'rugsėjo',
  'spalio',
  'lapkričio',
  'gruodžio',
]

/** "spalio 12–18 d.", "rugsėjo 28 – spalio 4 d." */
function span(from: string, to: string): string {
  const a = fromISODate(from)
  const b = fromISODate(to)
  return a.getMonth() === b.getMonth()
    ? `${MONTHS_GENITIVE[a.getMonth()]} ${a.getDate()}–${b.getDate()} d.`
    : `${MONTHS_GENITIVE[a.getMonth()]} ${a.getDate()} – ${MONTHS_GENITIVE[b.getMonth()]} ${b.getDate()} d.`
}

/** The dates a period covers (Monday–Sunday weeks, calendar months) and how to say them. */
export function periodRange(period: Period, today: string) {
  if (period === 'month') {
    const date = fromISODate(today)
    const from = toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
    const to = toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
    const name = MONTHS[date.getMonth()]!
    return { from, to, label: `${name.charAt(0).toUpperCase()}${name.slice(1)}` }
  }
  const monday = addDays(weekStart(today), period === 'lastWeek' ? -7 : 0)
  const sunday = addDays(monday, 6)
  return { from: monday, to: sunday, label: span(monday, sunday) }
}

export function valueOf(entry: LeaderboardEntry, metric: Metric): number {
  switch (metric) {
    case 'run':
      return entry.runKm
    case 'ride':
      return entry.rideKm
    case 'workouts':
      return entry.workouts
    case 'hosted':
      return entry.hosted
  }
}

/** "42,2 km", "5 treniruotės" is left to the caller; this is the number and its unit. */
export function formatValue(value: number, metric: Metric): { number: string; unit: string } {
  if (metric === 'run' || metric === 'ride') return { number: formatKm(value), unit: 'km' }
  return { number: String(value), unit: '' }
}

export interface Ranked {
  entry: LeaderboardEntry
  value: number
  /** Shared by people with equal totals (1, 2, 2, 4…). */
  rank: number
}

/** Everyone with something to show for the metric, best first. */
export function rank(entries: LeaderboardEntry[], metric: Metric): Ranked[] {
  const sorted = entries
    .map((entry) => ({ entry, value: valueOf(entry, metric) }))
    .filter((r) => r.value > 0)
    .sort(
      (a, b) =>
        b.value - a.value ||
        b.entry.workouts - a.entry.workouts ||
        a.entry.user.name.localeCompare(b.entry.user.name, 'lt'),
    )
  let previous: Ranked | undefined
  return sorted.map((r, i) => {
    const ranked = { ...r, rank: previous?.value === r.value ? previous.rank : i + 1 }
    previous = ranked
    return ranked
  })
}
