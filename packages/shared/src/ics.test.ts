import { describe, expect, it } from 'vitest'
import { buildIcs, escapeText, foldLine } from './ics'

const NOW = new Date('2026-11-23T08:00:00Z')

describe('buildIcs', () => {
  it('writes a valid calendar with CRLF line ends and a closing line', () => {
    const ics = buildIcs([{ uid: 'a@pm', title: 'Ilgasis bėgimas', date: '2026-12-05' }], {
      name: 'Planas',
      now: NOW,
    })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true)
    expect(ics).not.toMatch(/[^\r]\n/)
    expect(ics).toContain('DTSTAMP:20261123T080000Z')
    expect(ics).toContain('UID:a@pm')
  })

  it('makes all-day events from a date and timed ones from a date and time', () => {
    const ics = buildIcs(
      [
        { uid: '1', title: 'Plan', date: '2026-12-05' },
        { uid: '2', title: 'Run', date: '2026-12-06', startTime: '09:30', endTime: '11:00' },
        { uid: '3', title: 'No end', date: '2026-12-07', startTime: '18:15' },
        { uid: '4', title: 'Late', date: '2026-12-08', startTime: '23:30' },
      ],
      { name: 'x', now: NOW },
    )
    expect(ics).toContain('DTSTART;VALUE=DATE:20261205')
    expect(ics).toContain('DTSTART:20261206T093000\r\nDTEND:20261206T110000')
    expect(ics).toContain('DTSTART:20261207T181500\r\nDTEND:20261207T191500')
    expect(ics).toContain('DTSTART:20261208T233000\r\nDTEND:20261208T235900')
  })

  it('escapes commas, semicolons, backslashes and new lines', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne')
    const ics = buildIcs(
      [
        {
          uid: '1',
          title: 'Bėgimas, 10 km; lengvai',
          date: '2026-12-05',
          location: 'Danės krantinė',
        },
      ],
      { name: 'x', now: NOW },
    )
    expect(ics).toContain('SUMMARY:Bėgimas\\, 10 km\\; lengvai')
  })

  it('folds long lines at 75 bytes, never splitting a letter', () => {
    const long = `DESCRIPTION:${'ė'.repeat(80)}`
    const folded = foldLine(long)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    const enc = new TextEncoder()
    for (const [i, line] of lines.entries()) {
      expect(enc.encode(line).length).toBeLessThanOrEqual(75)
      if (i > 0) expect(line.startsWith(' ')).toBe(true)
    }
    // Unfolding gives the original back.
    expect(lines.map((l, i) => (i === 0 ? l : l.slice(1))).join('')).toBe(long)
    expect(foldLine('short')).toBe('short')
  })
})
