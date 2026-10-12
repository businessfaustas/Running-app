export const MINUTES_PER_DAY = 24 * 60

/** Local calendar date as `YYYY-MM-DD` (not UTC, unlike `toISOString`). */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parses a `YYYY-MM-DD` string as a local-midnight Date. */
export function fromISODate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDays(isoDate: string, days: number): string {
  const date = fromISODate(isoDate)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** `"10:30"` or `"10:30:00"` → 630. `"24:00"` is allowed and maps to the end of the day. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Invalid time: ${time}`)
  }
  return h * 60 + m
}

/** 630 → `"10:30"`. */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
