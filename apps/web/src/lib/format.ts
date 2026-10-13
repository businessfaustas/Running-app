import { addDays, fromISODate, timeToMinutes, toISODate } from '@grouppace/shared'

const LOCALE = 'en-GB'
const weekdayShort = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })
const shortDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const longDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const clock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })

export const weekday = (date: string) => weekdayShort.format(fromISODate(date))

/** "Today", "Tomorrow", "Yesterday", otherwise "Thu 15 Oct". */
export function relativeDay(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, 1)) return 'Tomorrow'
  if (date === addDays(today, -1)) return 'Yesterday'
  return shortDate.format(fromISODate(date))
}

/** "Tuesday 13 October". */
export const longDay = (date: string) => longDate.format(fromISODate(date))

export const formatKm = (km: number) => (Number.isInteger(km) ? String(km) : km.toFixed(1))

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

function minutesBetween(start: string, end: string | null): number | null {
  if (!end) return null
  const minutes = timeToMinutes(end) - timeToMinutes(start)
  return minutes > 0 ? minutes : null
}

/** "1 h 30 min", "45 min"; null without an end time. */
export function duration(start: string, end: string | null): string | null {
  const minutes = minutesBetween(start, end)
  if (minutes === null) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** "1h30", "45m": for tight spaces. */
export function shortDuration(start: string, end: string | null): string | null {
  const minutes = minutesBetween(start, end)
  if (minutes === null) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Chat-list style timestamp: "09:41", "Yesterday", "Mon", "12 Oct". */
export function messageTime(iso: string, now = new Date()): string {
  const at = new Date(iso)
  const day = toISODate(at)
  const today = toISODate(now)
  if (day === today) return clock.format(at)
  if (day === addDays(today, -1)) return 'Yesterday'
  if (day > addDays(today, -7)) return weekdayShort.format(at)
  return dayMonth.format(at)
}

export const clockTime = (iso: string) => clock.format(new Date(iso))

/** True once the workout's end (or start, without an end) has passed. */
export function isPast(date: string, start: string, end: string | null, now = new Date()) {
  const today = toISODate(now)
  if (date !== today) return date < today
  const minutes = now.getHours() * 60 + now.getMinutes()
  return timeToMinutes(end ?? start) <= minutes
}
