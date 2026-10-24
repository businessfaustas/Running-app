import { fromISODate, type Race } from '@pacemates/shared'
import { dayMonth, weekday } from '../../lib/format'

export const MONTHS = [
  'sausis',
  'vasaris',
  'kovas',
  'balandis',
  'gegužė',
  'birželis',
  'liepa',
  'rugpjūtis',
  'rugsėjis',
  'spalis',
  'lapkritis',
  'gruodis',
]

export interface RaceWhen {
  /** The confirmed date, or the 15th of the month the next edition is expected. */
  sortDate: string
  /** "Št, gegužės 15 d." or "~ gegužė 2027". */
  label: string
  confirmed: boolean
  /** Days from today to a confirmed date; null when the date isn't announced yet. */
  daysUntil: number | null
  /** The edition that has already taken place, when the catalogue still lists it. */
  lastDate: string | null
}

/**
 * When a race happens next. A confirmed date that has passed means that edition is over, so
 * the race rolls on to its usual month the following year – the calendar never goes stale.
 */
export function raceWhen(race: Race, today: string): RaceWhen {
  if (race.date && race.date >= today) {
    const days = Math.round(
      (fromISODate(race.date).getTime() - fromISODate(today).getTime()) / 86_400_000,
    )
    return {
      sortDate: race.date,
      label: `${weekday(race.date)}, ${dayMonth(race.date)}`,
      confirmed: true,
      daysUntil: days,
      lastDate: null,
    }
  }

  const month = String(race.typicalMonth).padStart(2, '0')
  const thisMonth = today.slice(0, 7)
  // An unannounced race this month still counts as upcoming; a finished one moves on a year.
  let year = race.date ? Number(race.date.slice(0, 4)) + 1 : Number(today.slice(0, 4))
  while (`${year}-${month}` < thisMonth) year++
  return {
    sortDate: `${year}-${month}-15`,
    label: `~ ${MONTHS[race.typicalMonth - 1]} ${year}`,
    confirmed: false,
    daysUntil: null,
    lastDate: race.date,
  }
}

/** "Gegužė 2027" for list headings. */
export function monthHeading(sortDate: string): string {
  const date = fromISODate(sortDate)
  const name = MONTHS[date.getMonth()]!
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${date.getFullYear()}`
}

/** "Po 12 d.", "Rytoj", "Šiandien" – only for confirmed dates within a few months. */
export function countdown(days: number | null): string | null {
  if (days === null || days < 0 || days > 120) return null
  if (days === 0) return 'Šiandien'
  if (days === 1) return 'Rytoj'
  return `Po ${days} d.`
}

export { todayISO } from '../../lib/clock'
