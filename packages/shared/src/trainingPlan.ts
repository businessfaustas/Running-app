import { addDays, fromISODate, toISODate } from './time'

/*
 * Week-by-week training plans for a race, worked out from the race's distance and date, the
 * person's level and how many days a week they can train. No external service and no AI: a plain
 * periodised build (base → build → specific), an easy week every fourth week, and a taper.
 *
 * Plans describe effort ("talking pace", "hard but controlled"), never fixed paces, and are
 * general guidance for healthy adults – not medical or coaching advice.
 */

export type Level = 'starter' | 'regular' | 'strong'
export type Discipline = 'run' | 'ride'
export type SessionKind = 'easy' | 'long' | 'tempo' | 'intervals' | 'strides' | 'race' | 'rest'

export interface PlanSession {
  /** 0 = Monday … 6 = Sunday. */
  day: number
  kind: SessionKind
  /** Kilometres; 0 for rest. */
  km: number
  /** What to do, in Lithuanian. */
  note: string
}

export interface PlanWeek {
  /** 1-based. */
  week: number
  /** The Monday this week starts on (ISO date), when the race has a date. */
  starts: string | null
  phase: 'base' | 'build' | 'specific' | 'taper' | 'race'
  /** Easy week: less volume to absorb the training. */
  easy: boolean
  totalKm: number
  sessions: PlanSession[]
  tip: string
}

export interface TrainingPlan {
  discipline: Discipline
  distanceKm: number
  level: Level
  daysPerWeek: number
  weeks: PlanWeek[]
  peakWeekKm: number
  longestKm: number
  /** True when there wasn't time to reach the usual peak safely, so the build is gentler. */
  gentler: boolean
}

export interface PlanInput {
  raceType: 'ROAD' | 'TRAIL' | 'ULTRA' | 'CYCLING' | 'TRIATHLON'
  /** The distance being trained for, in km. */
  distanceKm: number
  /** The race's date if confirmed; otherwise the plan is as long as is usual for the distance. */
  raceDate: string | null
  /** Today, to count the weeks left. */
  today: string
  level: Level
  /** 3 to 5. */
  daysPerWeek: number
}

export const LEVELS: { id: Level; label: string; blurb: string }[] = [
  { id: 'starter', label: 'Pradedantysis', blurb: 'Bėgi ar mini retai arba grįžti po pertraukos' },
  { id: 'regular', label: 'Reguliarus', blurb: 'Sportuoji kelis kartus per savaitę' },
  { id: 'strong', label: 'Pažengęs', blurb: 'Treniruojiesi metų metus ir turi startų patirtį' },
]

/** Disciplines we can plan for. Triathlon mixes three sports, so it gets no plan yet. */
export function disciplineFor(raceType: PlanInput['raceType']): Discipline | null {
  if (raceType === 'ROAD' || raceType === 'TRAIL' || raceType === 'ULTRA') return 'run'
  if (raceType === 'CYCLING') return 'ride'
  return null
}

/** Where a level's weeks start, as a share of the peak week – never more than the level's base. */
const START_RATIO: Record<Level, number> = { starter: 0.45, regular: 0.62, strong: 0.78 }
/** What someone at each level can sensibly cover in a first week, whatever the race (km). */
const LEVEL_BASE: Record<Discipline, Record<Level, number>> = {
  run: { starter: 16, regular: 28, strong: 40 },
  ride: { starter: 45, regular: 90, strong: 140 },
}
/** Weekly volume grows by at most this much from one build week to the next. */
const MAX_WEEKLY_GROWTH = 1.1
/** Peak week as a multiple of the longest session: 3 days ≈ long run + two 12 km runs for a marathon. */
const DAY_FACTOR: Record<number, number> = { 3: 1.8, 4: 2.05, 5: 2.35 }
const DAY_NAMES = [
  'Pirmadienis',
  'Antradienis',
  'Trečiadienis',
  'Ketvirtadienis',
  'Penktadienis',
  'Šeštadienis',
  'Sekmadienis',
]
export const dayName = (day: number) => DAY_NAMES[day] ?? ''

/** The longest single session a plan builds up to. */
export function peakLongKm(discipline: Discipline, distanceKm: number): number {
  if (discipline === 'ride') {
    return distanceKm < 60 ? distanceKm * 1.1 : Math.min(distanceKm * 0.9, 110)
  }
  if (distanceKm <= 5) return 8
  if (distanceKm <= 10.5) return 14
  if (distanceKm <= 21.2) return 19
  if (distanceKm <= 42.3) return 32
  return Math.min(distanceKm * 0.45, 42)
}

/** How many weeks a plan usually runs, for races with no confirmed date. */
export function usualWeeks(discipline: Discipline, distanceKm: number): number {
  if (discipline === 'ride') return distanceKm >= 100 ? 14 : 10
  if (distanceKm <= 5) return 6
  if (distanceKm <= 10.5) return 8
  if (distanceKm <= 21.2) return 12
  if (distanceKm <= 42.3) return 16
  return 18
}

const MIN_WEEKS = 4
const MAX_WEEKS = 20

/** Whole weeks from today until the race week (race week counts as the last). */
export function weeksUntil(today: string, raceDate: string): number {
  const days = Math.round(
    (fromISODate(raceDate).getTime() - fromISODate(today).getTime()) / 86_400_000,
  )
  return Math.ceil((days + 1) / 7)
}

const round = (n: number, step = 0.5) => Math.max(0, Math.round(n / step) * step)

/** Monday of the week that contains `isoDate`. */
function mondayOf(isoDate: string): string {
  const d = fromISODate(isoDate)
  const shift = (d.getDay() + 6) % 7
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - shift))
}

const TIPS: Record<PlanWeek['phase'], string> = {
  base: 'Šią savaitę svarbiausia reguliarumas, ne greitis. Lengvai – tai kai dar gali kalbėtis.',
  build: 'Treniruočių daugėja. Miegas ir valgymas dabar dirba už tave – nepamiršk poilsio dienų.',
  specific:
    'Artėjame prie starto: ilgasis treniruoja ir kūną, ir galvą. Išbandyk startui skirtą aprangą ir mitybą.',
  taper: 'Krūvis mažėja, kad startuotum šviežias. Jei jautiesi „per lengvai“ – taip ir turi būti.',
  race: 'Startų savaitė. Nieko naujo: ta pati avalynė, tas pats pusryčių rinkinys. Sėkmės!',
}

/**
 * The plan, or null when the race can't be planned (triathlon), the date has passed, or there
 * are fewer weeks left than a plan needs.
 */
export function buildTrainingPlan(input: PlanInput): TrainingPlan | null {
  const discipline = disciplineFor(input.raceType)
  if (!discipline) return null
  const days = Math.min(5, Math.max(3, Math.round(input.daysPerWeek)))
  let weekCount: number
  if (input.raceDate) {
    const left = weeksUntil(input.today, input.raceDate)
    if (left < MIN_WEEKS) return null
    weekCount = Math.min(MAX_WEEKS, left)
  } else {
    weekCount = usualWeeks(discipline, input.distanceKm)
  }

  const usualLong = peakLongKm(discipline, input.distanceKm)
  const usualPeak = Math.max(usualLong * (DAY_FACTOR[days] ?? 2.5), usualLong * 1.6)
  const startWeek = Math.min(
    usualPeak * START_RATIO[input.level],
    LEVEL_BASE[discipline][input.level],
  )
  // The last 3 weeks are taper (2) and race week (1); the build runs up to the week before them.
  const buildWeeks = weekCount - 3
  // Never ask for more than ~10 % more each week: with little time left, build a lower peak.
  const reachable = startWeek * MAX_WEEKLY_GROWTH ** Math.max(0, buildWeeks - 1)
  const peakWeek = Math.min(usualPeak, reachable)
  // Only worth telling people when the peak is clearly (over 10 %) lower than usual.
  const gentler = peakWeek < usualPeak * 0.9
  const peakLong = usualLong * (peakWeek / usualPeak)
  const planStart = input.raceDate ? mondayOf(addDays(input.raceDate, -(weekCount - 1) * 7)) : null

  const weeks: PlanWeek[] = []
  for (let i = 0; i < weekCount; i++) {
    const week = i + 1
    const phase: PlanWeek['phase'] =
      week === weekCount
        ? 'race'
        : week > buildWeeks
          ? 'taper'
          : week <= Math.ceil(buildWeeks * 0.4)
            ? 'base'
            : week <= Math.ceil(buildWeeks * 0.75)
              ? 'build'
              : 'specific'
    const easy = phase !== 'taper' && phase !== 'race' && week % 4 === 0 && week < buildWeeks

    let volume: number
    if (phase === 'race') volume = peakWeek * 0.45
    else if (phase === 'taper') volume = peakWeek * (week === buildWeeks + 1 ? 0.75 : 0.6)
    else {
      const t = buildWeeks <= 1 ? 1 : i / (buildWeeks - 1)
      // Geometric, so each week is the same percentage more than the last.
      volume = startWeek * (Math.max(peakWeek, startWeek) / startWeek) ** t
      if (easy) volume *= 0.78
    }
    // The long session grows towards its peak, a bit slower than the weekly total.
    // The long session stays the same share of the week all the way, so it reaches its peak in the peak week.
    let long =
      phase === 'race' ? 0 : Math.min(peakLong, volume * (peakLong / Math.max(peakWeek, 1)))
    if (phase === 'taper') long = Math.min(peakLong * (week === buildWeeks + 1 ? 0.65 : 0.45), long)
    long = round(long)
    volume = round(volume)

    weeks.push({
      week,
      starts: planStart ? addDays(planStart, i * 7) : null,
      phase,
      easy,
      totalKm: volume,
      sessions: sessionsFor({
        discipline,
        days,
        phase,
        easy,
        volume,
        long,
        distanceKm: input.distanceKm,
      }),
      tip: easy
        ? 'Lengvesnė savaitė: kūnas stiprėja poilsio metu, ne treniruotės metu.'
        : TIPS[phase],
    })
  }

  return {
    discipline,
    distanceKm: input.distanceKm,
    level: input.level,
    daysPerWeek: days,
    weeks,
    peakWeekKm: Math.max(...weeks.map((w) => w.totalKm)),
    // The longest training session, not counting the race itself.
    longestKm: Math.max(
      ...weeks.flatMap((w) => w.sessions.filter((s) => s.kind !== 'race').map((s) => s.km)),
    ),
    gentler,
  }
}

interface SessionArgs {
  discipline: Discipline
  days: number
  phase: PlanWeek['phase']
  easy: boolean
  volume: number
  long: number
  distanceKm: number
}

/** Training days: Tue/Thu/Sat or Tue/Wed/Fri/Sun, etc., always with the long one at the weekend. */
const DAY_SETS: Record<number, number[]> = { 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [0, 1, 3, 4, 6] }

function sessionsFor({
  discipline,
  days,
  phase,
  easy,
  volume,
  long,
  distanceKm,
}: SessionArgs): PlanSession[] {
  const run = discipline === 'run'
  const verb = run ? 'bėgimas' : 'važiavimas'
  const set = DAY_SETS[days]!
  const out: PlanSession[] = []

  if (phase === 'race') {
    // Race week: two short easy sessions early, rest, then the race itself on the weekend.
    out.push({
      day: 1,
      kind: 'easy',
      km: round(volume * 0.28),
      note: `Lengvas ${verb}, kūnui pasitempti.`,
    })
    out.push({
      day: 3,
      kind: 'strides',
      km: round(volume * 0.2),
      note: run
        ? 'Lengvas bėgimas su 4–5 trumpais pagreitėjimais (po 15 sek.).'
        : 'Lengvas važiavimas su kelis kartus pagreitinta mynimo kadencija.',
    })
    out.push({ day: 5, kind: 'rest', km: 0, note: 'Poilsis. Pasiruošk aprangą, numerį ir maistą.' })
    out.push({
      day: 6,
      kind: 'race',
      km: distanceKm,
      note: 'STARTAS! Pradėk ramiau, nei nori – finišo tiesiojoje padėkosi sau.',
    })
    return out.sort((a, b) => a.day - b.day)
  }

  const longDay = set[set.length - 1]!
  const rest = Math.max(0, volume - long)
  const others = set.slice(0, -1)
  const quality =
    phase === 'taper'
      ? 'strides'
      : phase === 'base' || easy
        ? 'strides'
        : phase === 'build'
          ? 'tempo'
          : 'intervals'

  // The second-to-last day gets the quality session; the rest are easy, sharing what's left.
  const qualityDay = others[Math.floor(others.length / 2)]!
  const qualityShare = quality === 'strides' ? 0.9 : 1.1
  const easyDays = others.filter((d) => d !== qualityDay)
  const perEasy = rest / (others.length - 1 + qualityShare) || 0

  for (const day of others) {
    if (day === qualityDay) {
      out.push({
        day,
        kind: quality,
        km: round(perEasy * qualityShare),
        note:
          quality === 'tempo'
            ? run
              ? 'Apšilimas, 15–30 min. tempu (sunku, bet kontroliuojama), atvėsimas.'
              : 'Apšilimas, 2 × 10–15 min. tempo intensyvumu su poilsiu tarp jų, atvėsimas.'
            : quality === 'intervals'
              ? run
                ? 'Apšilimas, 5–6 × 3 min. sparčiai su 2 min. poilsio, atvėsimas.'
                : 'Apšilimas, 5 × 4 min. stipriai su 3 min. lengvo mynimo, atvėsimas.'
              : run
                ? 'Lengvas bėgimas ir 4–6 trumpi pagreitėjimai (po 15 sek.) pabaigoje.'
                : 'Lengvas važiavimas su keliais trumpais pagreitėjimais.',
      })
    }
  }
  for (const day of easyDays) {
    out.push({
      day,
      kind: 'easy',
      km: round(perEasy),
      note: `Lengvas ${verb}: tokiu tempu, kad galėtum kalbėtis.`,
    })
  }
  out.push({
    day: longDay,
    kind: 'long',
    km: long,
    note: run
      ? 'Ilgasis bėgimas: lėtai ir tolygiai. Neskubėk – svarbu atstumas, ne tempas.'
      : 'Ilgasis važiavimas: tolygiai, valgyk ir gerk kas ~30–40 min.',
  })
  // Show rest days too, so a week reads as a week.
  for (let d = 0; d < 7; d++) {
    if (!out.some((s) => s.day === d))
      out.push({ day: d, kind: 'rest', km: 0, note: 'Poilsis arba lengvas pasivaikščiojimas.' })
  }
  return out.sort((a, b) => a.day - b.day)
}
