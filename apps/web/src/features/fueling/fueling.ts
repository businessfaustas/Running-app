/*
 * Race fuelling estimate. Deliberately simple, transparent rules of thumb:
 *
 * - Max heart rate: measured if known, else Tanaka (208 − 0.7 × age), or Gulati
 *   (206 − 0.88 × age) for women.
 * - %HRmax → %VO2max: Swain et al. (1994), %HRmax = 0.64 × %VO2max + 37.
 * - Energy: running costs ≈ 1 kcal per kg per km; each 100 m of climbing ≈ 1 extra km.
 * - Share of energy from carbohydrate rises with intensity (Romijn et al. 1993; crossover
 *   concept): ≈ 25 % at easy effort, ≈ 55 % at 65 % VO2max, ≈ 80 % at 85 %.
 * - What to eat during the race follows Jeukendrup (2014) / ACSM: nothing under ~45 min,
 *   optional up to 30 g/h to 75 min, 30–60 g/h to 2 h, up to 90 g/h beyond 2.5 h (glucose +
 *   fructose), capped by how used the gut is to fuelling.
 *
 * These are estimates to plan and practise with, not medical advice.
 */

export type Sex = 'female' | 'male' | 'other'
export type GutTraining = 'none' | 'some' | 'trained'

export interface FuelingInput {
  weightKg: number
  age: number
  sex: Sex
  /** Measured maximum heart rate; null → estimated from age. */
  maxHr: number | null
  distanceKm: number
  /** Planned race pace, seconds per km. */
  paceSecPerKm: number
  /** Average heart rate you plan to hold. */
  targetHr: number
  temperatureC: number
  elevationGainM: number
  gutTraining: GutTraining
  /** Carbohydrate in one gel (or other unit you'll carry), grams. */
  gelCarbsG: number
}

export interface Intake {
  /** Recommended grams per hour (0 when nothing is needed). */
  perHour: number
  low: number
  high: number
  level: 'none' | 'optional' | 'needed'
}

export interface FuelStop {
  minute: number
  km: number
  grams: number
}

export interface FuelingPlan {
  distanceKm: number
  durationMin: number
  maxHr: number
  maxHrEstimated: boolean
  /** targetHr ÷ maxHr, 0–1. */
  hrFraction: number
  /** Estimated share of VO2max, 0–1. */
  vo2Fraction: number
  zone: 1 | 2 | 3 | 4 | 5
  kcalTotal: number
  kcalPerHour: number
  /** Share of energy from carbohydrate, 0–1. */
  carbFraction: number
  carbBurnPerHour: number
  carbBurnTotal: number
  /** Muscle + liver glycogen, rough estimate. */
  glycogenG: number
  /** Minutes until stores run low if you ate nothing (null if they'd outlast the race). */
  minutesUntilLow: number | null
  /** Where on the course that happens. */
  kmUntilLow: number | null
  intake: Intake
  schedule: FuelStop[]
  /** Carbohydrate the schedule actually delivers. */
  scheduleTotalG: number
  fluidsMlPerHour: number
  sodiumMgPerHour: number
  /** Pre-race meal, grams of carbohydrate (2–4 h before). */
  preRaceMealG: [number, number]
  /** Carb loading per day for the 36–48 h before long races; null for short ones. */
  carbLoadPerDayG: [number, number] | null
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round5 = (v: number) => Math.round(v / 5) * 5
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function estimateMaxHr(age: number, sex: Sex): number {
  return Math.round(sex === 'female' ? 206 - 0.88 * age : 208 - 0.7 * age)
}

/** Five zones by % of max heart rate. */
export function hrZone(hrFraction: number): FuelingPlan['zone'] {
  if (hrFraction < 0.6) return 1
  if (hrFraction < 0.7) return 2
  if (hrFraction < 0.8) return 3
  if (hrFraction < 0.9) return 4
  return 5
}

/** Swain: %HRmax = 0.64 × %VO2max + 37. */
export function vo2FractionFromHr(hrFraction: number): number {
  return clamp((hrFraction * 100 - 37) / 0.64 / 100, 0.2, 1)
}

/** Share of energy from carbohydrate at a given %VO2max (piecewise linear). */
export function carbFractionAt(vo2Fraction: number): number {
  const points: [number, number][] = [
    [0.4, 0.25],
    [0.65, 0.55],
    [0.85, 0.8],
    [0.95, 0.92],
  ]
  if (vo2Fraction <= points[0]![0]) return points[0]![1]
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!
    const [x0, y0] = points[i - 1]!
    if (vo2Fraction <= x1) return lerp(y0, y1, (vo2Fraction - x0) / (x1 - x0))
  }
  return points.at(-1)![1]
}

const GUT_CAP: Record<GutTraining, number> = { none: 60, some: 75, trained: 100 }

/** How much carbohydrate to take per hour, from race length and effort. */
export function recommendIntake(durationMin: number, hrFraction: number, gut: GutTraining): Intake {
  const effort = clamp((hrFraction - 0.65) / (0.88 - 0.65), 0, 1)
  if (durationMin < 45) return { perHour: 0, low: 0, high: 0, level: 'none' }
  if (durationMin < 75) {
    return { perHour: effort >= 0.6 ? 20 : 0, low: 0, high: 30, level: 'optional' }
  }
  let low: number
  let high: number
  if (durationMin < 120) [low, high] = [30, 60]
  else if (durationMin < 150) [low, high] = [45, 75]
  else if (gut === 'trained') [low, high] = [70, 100]
  else [low, high] = [60, 90]
  const cap = GUT_CAP[gut]
  high = Math.min(high, cap)
  low = Math.min(low, high)
  return { perHour: round5(lerp(low, high, effort)), low, high, level: 'needed' }
}

/** Gels from ~20 min in, evenly spaced, the last at least 10 min before the finish. */
export function buildSchedule(
  durationMin: number,
  paceSecPerKm: number,
  perHour: number,
  gelCarbsG: number,
): FuelStop[] {
  if (perHour <= 0 || gelCarbsG <= 0) return []
  const interval = (60 * gelCarbsG) / perHour
  const first = Math.min(20, Math.max(10, interval))
  const stops: FuelStop[] = []
  for (let minute = first; minute <= durationMin - 10; minute += interval) {
    const rounded = Math.round(minute)
    stops.push({
      minute: rounded,
      km: Math.round(((rounded * 60) / paceSecPerKm) * 10) / 10,
      grams: gelCarbsG,
    })
  }
  return stops
}

export function planFueling(input: FuelingInput): FuelingPlan {
  const durationMin = (input.distanceKm * input.paceSecPerKm) / 60
  const maxHrEstimated = input.maxHr === null
  const maxHr = input.maxHr ?? estimateMaxHr(input.age, input.sex)
  const hrFraction = clamp(input.targetHr / maxHr, 0.4, 1)
  const vo2Fraction = vo2FractionFromHr(hrFraction)

  const flatEquivalentKm = input.distanceKm + Math.max(0, input.elevationGainM) / 100
  const kcalTotal = input.weightKg * flatEquivalentKm
  const hours = durationMin / 60
  const kcalPerHour = kcalTotal / hours

  const carbFraction = carbFractionAt(vo2Fraction)
  const carbBurnPerHour = (kcalPerHour * carbFraction) / 4
  const carbBurnTotal = carbBurnPerHour * hours

  // ~7 g per kg of body mass in muscle and liver on a normal diet; about 80 % is usable.
  const glycogenG = input.weightKg * 7
  const usableMinutes = ((glycogenG * 0.8) / carbBurnPerHour) * 60
  const minutesUntilLow = usableMinutes < durationMin ? Math.round(usableMinutes) : null

  const intake = recommendIntake(durationMin, hrFraction, input.gutTraining)
  const schedule = buildSchedule(durationMin, input.paceSecPerKm, intake.perHour, input.gelCarbsG)

  const heat = Math.max(0, input.temperatureC - 15)
  const cold = Math.max(0, 10 - input.temperatureC)
  const fluidsMlPerHour =
    Math.round(clamp(400 + (input.weightKg - 70) * 4 + heat * 20 - cold * 10, 300, 800) / 50) * 50
  const sodiumMgPerHour = Math.round(clamp(300 + heat * 25, 300, 800) / 50) * 50

  return {
    distanceKm: input.distanceKm,
    durationMin,
    maxHr,
    maxHrEstimated,
    hrFraction,
    vo2Fraction,
    zone: hrZone(hrFraction),
    kcalTotal: Math.round(kcalTotal),
    kcalPerHour: Math.round(kcalPerHour),
    carbFraction,
    carbBurnPerHour: Math.round(carbBurnPerHour),
    carbBurnTotal: Math.round(carbBurnTotal),
    glycogenG: Math.round(glycogenG),
    minutesUntilLow,
    kmUntilLow:
      minutesUntilLow === null ? null : Math.round((minutesUntilLow * 60) / input.paceSecPerKm),
    intake,
    schedule,
    scheduleTotalG: schedule.reduce((sum, stop) => sum + stop.grams, 0),
    fluidsMlPerHour,
    sodiumMgPerHour,
    preRaceMealG: [Math.round(input.weightKg * 1), Math.round(input.weightKg * 4)],
    carbLoadPerDayG:
      durationMin >= 90 ? [Math.round(input.weightKg * 10), Math.round(input.weightKg * 12)] : null,
  }
}

/** "5:30" → 330; null when it isn't m:ss. */
export function parsePaceInput(text: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim())
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** 125.4 → "2:05". */
export function formatClockMinutes(minutes: number): string {
  const total = Math.round(minutes)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
