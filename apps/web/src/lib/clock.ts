import { toISODate } from '@pacemates/shared'

/*
 * Workouts happen in Lithuania and their times are Lithuanian wall-clock times ("18:30 at
 * Vingis"), so "now" – today's date, the line on the timeline, whether a workout has
 * finished – is Vilnius time too, whatever time zone the phone is set to. The database does
 * the same (`now() at time zone 'Europe/Vilnius'`).
 */
export const APP_TIME_ZONE = 'Europe/Vilnius'

const vilnius = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** A Date whose local fields (getHours, getDate…) read Vilnius wall-clock time at `instant`. */
export function wallClock(instant: Date = new Date()): Date {
  const p: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {}
  for (const { type, value } of vilnius.formatToParts(instant)) p[type] = Number(value)
  return new Date(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!)
}

/** Today's date in Lithuania, as YYYY-MM-DD. */
export const todayISO = (instant: Date = new Date()) => toISODate(wallClock(instant))

/** True when the phone isn't on Lithuanian time (travelling, or a device set to UTC). */
export function awayFromLithuania(instant: Date = new Date()): boolean {
  const shifted = wallClock(instant).getTime() - Math.floor(instant.getTime() / 1000) * 1000
  return Math.abs(shifted) >= 60_000
}
