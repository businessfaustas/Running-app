import { addDays, fromISODate, timeToMinutes, toISODate } from '@pacemates/shared'
import { wallClock } from './clock'

/*
 * Lithuanian formatting. Intl's short lt-LT date styles read oddly ("10-15, kt"), so the
 * compact forms are spelled out here.
 */

const WEEKDAYS_SHORT = ['Sk', 'Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št']
const MONTHS_SHORT = [
  'saus.',
  'vas.',
  'kov.',
  'bal.',
  'geg.',
  'birž.',
  'liep.',
  'rugp.',
  'rugs.',
  'spal.',
  'lapkr.',
  'gruod.',
]
const weekdayLong = new Intl.DateTimeFormat('lt-LT', { weekday: 'long' })
const dayMonthLong = new Intl.DateTimeFormat('lt-LT', { day: 'numeric', month: 'long' })
const clock = new Intl.DateTimeFormat('lt-LT', { hour: '2-digit', minute: '2-digit' })
const pluralRules = new Intl.PluralRules('lt-LT')

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export interface PluralForms {
  /** 1, 21, 31… */
  one: string
  /** 2–9, 22–29… */
  few: string
  /** 0, 10–20, 30… */
  other: string
}

/** Picks the Lithuanian form for `n`: treniruotė / treniruotės / treniruočių. */
export function plural(n: number, forms: PluralForms): string {
  const category = pluralRules.select(n)
  return category === 'one' ? forms.one : category === 'few' ? forms.few : forms.other
}

/** "3 treniruotės". */
export const countOf = (n: number, forms: PluralForms) => `${n} ${plural(n, forms)}`

export const WORDS = {
  workout: { one: 'treniruotė', few: 'treniruotės', other: 'treniruočių' },
  spot: { one: 'vieta', few: 'vietos', other: 'vietų' },
  message: { one: 'žinutė', few: 'žinutės', other: 'žinučių' },
  person: { one: 'dalyvis', few: 'dalyviai', other: 'dalyvių' },
  race: { one: 'varžybos', few: 'varžybos', other: 'varžybų' },
  post: { one: 'įrašas', few: 'įrašai', other: 'įrašų' },
  reply: { one: 'atsakymas', few: 'atsakymai', other: 'atsakymų' },
  option: { one: 'variantas', few: 'variantai', other: 'variantų' },
  ride: { one: 'važiavimas', few: 'važiavimai', other: 'važiavimų' },
  club: { one: 'klubas', few: 'klubai', other: 'klubų' },
} satisfies Record<string, PluralForms>

/** "Pr", "An"… */
export const weekday = (date: string) => WEEKDAYS_SHORT[fromISODate(date).getDay()]!

/** "spalio 15 d." */
export const dayMonth = (date: string) => dayMonthLong.format(fromISODate(date))

/** "Šiandien", "Rytoj", "Vakar", otherwise "Kt, spalio 15 d." */
export function relativeDay(date: string, today: string): string {
  if (date === today) return 'Šiandien'
  if (date === addDays(today, 1)) return 'Rytoj'
  if (date === addDays(today, -1)) return 'Vakar'
  return `${weekday(date)}, ${dayMonth(date)}`
}

const ON_WEEKDAY = [
  'Sekmadienį',
  'Pirmadienį',
  'Antradienį',
  'Trečiadienį',
  'Ketvirtadienį',
  'Penktadienį',
  'Šeštadienį',
]

/** "Šiandien", "Rytoj", or "Ketvirtadienį" – for "… Vilniuje" headlines. */
export function whenHeadline(date: string, today: string): string {
  if (date === today) return 'Šiandien'
  if (date === addDays(today, 1)) return 'Rytoj'
  return ON_WEEKDAY[fromISODate(date).getDay()]!
}

/** "Ketvirtadienis, spalio 15 d." */
export const longDay = (date: string) =>
  `${capitalize(weekdayLong.format(fromISODate(date)))}, ${dayMonth(date)}`

/** Lithuanian decimals use a comma: "21,1". */
export const formatKm = (km: number) =>
  Number.isInteger(km) ? String(km) : km.toFixed(1).replace('.', ',')

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

function minutesBetween(start: string, end: string | null): number | null {
  if (!end) return null
  const minutes = timeToMinutes(end) - timeToMinutes(start)
  return minutes > 0 ? minutes : null
}

/** "1 val. 30 min.", "45 min." */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min.`
  return m === 0 ? `${h} val.` : `${h} val. ${m} min.`
}

/** Null without an end time. */
export function duration(start: string, end: string | null): string | null {
  const minutes = minutesBetween(start, end)
  return minutes === null ? null : formatMinutes(minutes)
}

/** "1:30 val.", "45 min.": for tight spaces. */
export function shortDuration(start: string, end: string | null): string | null {
  const minutes = minutesBetween(start, end)
  if (minutes === null) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min.`
  return `${h}:${String(m).padStart(2, '0')} val.`
}

/** Chat-list style timestamp: "09:41", "Vakar", "Pr", "spal. 12". */
export function messageTime(iso: string, now = new Date()): string {
  const at = new Date(iso)
  const day = toISODate(at)
  const today = toISODate(now)
  if (day === today) return clock.format(at)
  if (day === addDays(today, -1)) return 'Vakar'
  if (day > addDays(today, -7)) return WEEKDAYS_SHORT[at.getDay()]!
  return `${MONTHS_SHORT[at.getMonth()]} ${at.getDate()}`
}

export const clockTime = (iso: string) => clock.format(new Date(iso))

/** "Labas rytas" / "Laba diena" / "Labas vakaras" / "Labanakt". */
export function greeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 5) return 'Labanakt'
  if (hour < 11) return 'Labas rytas'
  if (hour < 18) return 'Laba diena'
  return 'Labas vakaras'
}

/** True once the workout's end (or start, without an end) has passed, in Lithuanian time. */
export function isPast(date: string, start: string, end: string | null, now = new Date()) {
  const wall = wallClock(now)
  const today = toISODate(wall)
  if (date !== today) return date < today
  const minutes = wall.getHours() * 60 + wall.getMinutes()
  return timeToMinutes(end ?? start) <= minutes
}

/** "Po 40 min.", "Po 3 val.", "Rytoj, 07:00" – how soon a workout starts. */
export function startsIn(date: string, start: string, now = new Date()): string {
  const wall = wallClock(now)
  const at = fromISODate(date)
  at.setMinutes(timeToMinutes(start))
  const minutes = Math.round((at.getTime() - wall.getTime()) / 60_000)
  if (minutes <= 0) return 'Jau vyksta'
  if (minutes < 60) return `Po ${minutes} min.`
  if (date === toISODate(wall)) return `Po ${Math.floor(minutes / 60)} val.`
  return `${relativeDay(date, toISODate(wall))}, ${start}`
}
