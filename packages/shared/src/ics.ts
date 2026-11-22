/*
 * A minimal iCalendar (.ics) writer, enough for calendar apps to import training plans and
 * workouts. Follows RFC 5545: CRLF line ends, escaped text, lines folded at 75 octets.
 */

export interface IcsEvent {
  /** Stable id: re-importing the same plan updates its events instead of duplicating them. */
  uid: string
  title: string
  description?: string
  location?: string
  /** `YYYY-MM-DD`. With `startTime` it is a timed event, without it an all-day event. */
  date: string
  /** `HH:MM`, local time (no time zone: calendars show it at that time wherever you are). */
  startTime?: string
  /** `HH:MM`. Defaults to one hour after the start. */
  endTime?: string | null
}

const compactDate = (date: string) => date.replaceAll('-', '')
const compactTime = (time: string) => `${time.replace(':', '')}00`

export function escapeText(text: string): string {
  return text
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Folds a line at 75 octets (not characters: Lithuanian letters take two), continuing with a space. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    // Continuation lines start with a space, which counts towards their 75.
    const limit = parts.length === 0 ? 75 : 74
    if (size + bytes > limit) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join('\r\n ')
}

function addHour(date: string, time: string): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number) as [number, number]
  const total = h * 60 + m + 60
  if (total < 24 * 60) {
    return {
      date,
      time: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
    }
  }
  // Past midnight: end at 23:59 the same day rather than inventing a second date.
  return { date, time: '23:59' }
}

export function buildIcs(events: IcsEvent[], options: { name: string; now?: Date }): string {
  const stamp = (options.now ?? new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PaceMates//LT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.name)}`,
  ]
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`)
    if (e.startTime) {
      const end = e.endTime ? { date: e.date, time: e.endTime } : addHour(e.date, e.startTime)
      lines.push(
        `DTSTART:${compactDate(e.date)}T${compactTime(e.startTime)}`,
        `DTEND:${compactDate(end.date)}T${compactTime(end.time)}`,
      )
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`)
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
