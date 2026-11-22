import { describe, expect, it } from 'vitest'
import {
  buildTrainingPlan,
  disciplineFor,
  peakLongKm,
  usualWeeks,
  weeksUntil,
  type Level,
  type PlanInput,
} from './trainingPlan'

const TODAY = '2026-11-23' // a Monday
const base: PlanInput = {
  raceType: 'ROAD',
  distanceKm: 21.0975,
  raceDate: '2027-02-14',
  today: TODAY,
  level: 'regular',
  daysPerWeek: 4,
}

describe('weeksUntil', () => {
  it('counts the race week as the last', () => {
    expect(weeksUntil('2026-11-23', '2026-11-29')).toBe(1)
    expect(weeksUntil('2026-11-23', '2026-12-06')).toBe(2)
    expect(weeksUntil('2026-11-23', '2026-12-13')).toBe(3)
  })
})

describe('buildTrainingPlan', () => {
  it('has one week per week left, ending with the race', () => {
    const plan = buildTrainingPlan(base)!
    expect(plan.weeks).toHaveLength(weeksUntil(TODAY, base.raceDate!))
    const last = plan.weeks.at(-1)!
    expect(last.phase).toBe('race')
    expect(last.sessions.find((s) => s.kind === 'race')?.km).toBeCloseTo(21.0975)
    expect(plan.weeks.map((w) => w.week)).toEqual(plan.weeks.map((_, i) => i + 1))
  })

  it('starts every week on a Monday and the race week contains the race date', () => {
    const plan = buildTrainingPlan(base)!
    for (const w of plan.weeks) expect(new Date(`${w.starts}T12:00:00`).getDay()).toBe(1)
    const raceWeek = plan.weeks.at(-1)!
    const start = new Date(`${raceWeek.starts}T12:00:00`).getTime()
    const race = new Date(`${base.raceDate}T12:00:00`).getTime()
    expect(race - start).toBeGreaterThanOrEqual(0)
    expect(race - start).toBeLessThan(7 * 86_400_000)
  })

  it('builds up, with an easy week every fourth week and a shrinking taper', () => {
    const plan = buildTrainingPlan(base)!
    const build = plan.weeks.filter((w) => w.phase !== 'taper' && w.phase !== 'race')
    for (const w of build.filter((w) => w.easy)) {
      expect(w.week % 4).toBe(0)
      const before = plan.weeks[w.week - 2]!
      expect(w.totalKm).toBeLessThan(before.totalKm)
    }
    const taper = plan.weeks
      .filter((w) => w.phase === 'taper' || w.phase === 'race')
      .map((w) => w.totalKm)
    expect(taper[0]!).toBeLessThan(plan.peakWeekKm)
    expect([...taper].sort((a, b) => b - a)).toEqual(taper)
    expect(plan.weeks[0]!.totalKm).toBeLessThan(plan.peakWeekKm)
  })

  it('never asks for more than the peak long run, nor a jump of more than a third in one week', () => {
    for (const level of ['starter', 'regular', 'strong'] as Level[]) {
      for (const distanceKm of [5, 10, 21.0975, 42.195]) {
        const plan = buildTrainingPlan({ ...base, level, distanceKm, raceDate: null })!
        expect(plan.longestKm).toBeLessThanOrEqual(peakLongKm('run', distanceKm))
        // Between build weeks (an easy week in between counts as the week before it), volume rises
        // by about 10 % a week at most, plus rounding to the nearest half kilometre.
        const build = plan.weeks.filter(
          (w) => !w.easy && (w.phase === 'base' || w.phase === 'build' || w.phase === 'specific'),
        )
        build.slice(1).forEach((w, i) => {
          const prev = build[i]!
          const gap = w.week - prev.week
          expect(w.totalKm, `week ${w.week} after ${prev.week}`).toBeLessThanOrEqual(
            prev.totalKm * 1.1 ** gap + 1.5,
          )
        })
      }
    }
  })

  it('gives stronger runners more than beginners, and more days more kilometres', () => {
    const starter = buildTrainingPlan({ ...base, level: 'starter' })!
    const strong = buildTrainingPlan({ ...base, level: 'strong' })!
    expect(strong.weeks[0]!.totalKm).toBeGreaterThan(starter.weeks[0]!.totalKm)
    const three = buildTrainingPlan({ ...base, daysPerWeek: 3 })!
    const five = buildTrainingPlan({ ...base, daysPerWeek: 5 })!
    expect(five.peakWeekKm).toBeGreaterThan(three.peakWeekKm)
  })

  it('puts the right number of training days in each week, the long one at the weekend', () => {
    for (const daysPerWeek of [3, 4, 5]) {
      const plan = buildTrainingPlan({ ...base, daysPerWeek })!
      for (const w of plan.weeks.slice(0, -1)) {
        const training = w.sessions.filter((s) => s.kind !== 'rest')
        expect(training).toHaveLength(daysPerWeek)
        expect(w.sessions).toHaveLength(7)
        const long = w.sessions.find((s) => s.kind === 'long')!
        expect([5, 6]).toContain(long.day)
        expect(w.sessions.map((s) => s.day)).toEqual([0, 1, 2, 3, 4, 5, 6])
      }
    }
  })

  it('has weekly totals that match the sessions, within rounding', () => {
    const plan = buildTrainingPlan(base)!
    for (const w of plan.weeks.slice(0, -1)) {
      const sum = w.sessions.reduce((a, s) => a + s.km, 0)
      expect(Math.abs(sum - w.totalKm)).toBeLessThanOrEqual(2.5)
    }
  })

  it('uses a usual length when the race has no date', () => {
    const plan = buildTrainingPlan({ ...base, raceDate: null })!
    expect(plan.weeks).toHaveLength(usualWeeks('run', base.distanceKm))
    expect(plan.weeks.every((w) => w.starts === null)).toBe(true)
  })

  it('refuses races that are too close, already past, or triathlons', () => {
    expect(buildTrainingPlan({ ...base, raceDate: '2026-12-06' })).toBeNull()
    expect(buildTrainingPlan({ ...base, raceDate: '2026-10-01' })).toBeNull()
    expect(buildTrainingPlan({ ...base, raceType: 'TRIATHLON' })).toBeNull()
    expect(disciplineFor('TRIATHLON')).toBeNull()
  })

  it('caps very distant races at 20 weeks', () => {
    expect(buildTrainingPlan({ ...base, raceDate: '2027-12-31' })!.weeks).toHaveLength(20)
  })

  it('plans rides in kilometres too', () => {
    const plan = buildTrainingPlan({
      ...base,
      raceType: 'CYCLING',
      distanceKm: 100,
      raceDate: null,
    })!
    expect(plan.discipline).toBe('ride')
    expect(plan.longestKm).toBeLessThanOrEqual(110)
    expect(plan.weeks.some((w) => w.sessions.some((s) => /važiavimas/.test(s.note)))).toBe(true)
  })

  it('is deterministic', () => {
    expect(JSON.stringify(buildTrainingPlan(base))).toBe(JSON.stringify(buildTrainingPlan(base)))
  })

  it('says so when there is too little time to build up to the usual peak safely', () => {
    const rushed = buildTrainingPlan({
      ...base,
      level: 'starter',
      distanceKm: 42.195,
      raceDate: '2027-01-24',
    })!
    expect(rushed.gentler).toBe(true)
    const usual = peakLongKm('run', 42.195)
    expect(rushed.longestKm).toBeLessThan(usual)
    expect(
      buildTrainingPlan({ ...base, level: 'strong', distanceKm: 5, raceDate: null })!.gentler,
    ).toBe(false)
  })

  it('does not tell anyone to run a distance they cannot yet cover in the first weeks', () => {
    const plan = buildTrainingPlan({
      ...base,
      level: 'starter',
      distanceKm: 42.195,
      raceDate: null,
    })!
    expect(plan.weeks[0]!.sessions.find((s) => s.kind === 'long')!.km).toBeLessThanOrEqual(12)
  })
})
