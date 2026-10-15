import { describe, expect, it } from 'vitest'
import {
  buildSchedule,
  carbFractionAt,
  estimateMaxHr,
  formatClockMinutes,
  hrZone,
  parsePaceInput,
  planFueling,
  recommendIntake,
  vo2FractionFromHr,
  type FuelingInput,
} from './fueling'

const marathon: FuelingInput = {
  weightKg: 70,
  age: 35,
  sex: 'male',
  maxHr: null,
  distanceKm: 42.195,
  paceSecPerKm: 300,
  targetHr: 158,
  temperatureC: 15,
  elevationGainM: 0,
  gutTraining: 'some',
  gelCarbsG: 25,
}

describe('fuelling model', () => {
  it('estimates max heart rate from age', () => {
    expect(estimateMaxHr(35, 'male')).toBe(184)
    expect(estimateMaxHr(35, 'female')).toBe(175)
  })

  it('maps heart rate to zones and VO2max', () => {
    expect(hrZone(0.55)).toBe(1)
    expect(hrZone(0.75)).toBe(3)
    expect(hrZone(0.86)).toBe(4)
    expect(vo2FractionFromHr(0.85)).toBeCloseTo(0.75, 2)
  })

  it('burns more carbohydrate as effort rises', () => {
    expect(carbFractionAt(0.3)).toBe(0.25)
    expect(carbFractionAt(0.65)).toBeCloseTo(0.55)
    expect(carbFractionAt(0.75)).toBeCloseTo(0.675)
    expect(carbFractionAt(1)).toBe(0.92)
  })

  it('recommends intake by race length, effort and gut training', () => {
    expect(recommendIntake(30, 0.9, 'trained').level).toBe('none')
    expect(recommendIntake(60, 0.7, 'none')).toMatchObject({ level: 'optional', perHour: 0 })
    expect(recommendIntake(100, 0.88, 'some')).toMatchObject({ perHour: 60, low: 30, high: 60 })
    expect(recommendIntake(210, 0.88, 'none').perHour).toBe(60) // capped by an untrained gut
    expect(recommendIntake(210, 0.88, 'trained').perHour).toBe(100)
  })

  it('plans a 3:30 marathon', () => {
    const plan = planFueling(marathon)
    expect(plan.durationMin).toBeCloseTo(211, 0)
    expect(plan.maxHrEstimated).toBe(true)
    expect(plan.zone).toBe(4)
    expect(plan.kcalTotal).toBe(2954)
    expect(plan.intake.level).toBe('needed')
    expect(plan.intake.perHour).toBeGreaterThanOrEqual(60)
    expect(plan.intake.perHour).toBeLessThanOrEqual(75)
    // Without fuel, stores run low before the finish – the classic "wall".
    expect(plan.minutesUntilLow).not.toBeNull()
    expect(plan.minutesUntilLow!).toBeLessThan(plan.durationMin)
    expect(plan.schedule[0]).toMatchObject({ minute: 20, grams: 25 })
    expect(plan.schedule.at(-1)!.minute).toBeLessThanOrEqual(plan.durationMin - 10)
    expect(plan.kmUntilLow).toBeLessThan(42)
    expect(plan.carbLoadPerDayG).toEqual([700, 840])
  })

  it('needs nothing extra for an easy 5 km', () => {
    const plan = planFueling({ ...marathon, distanceKm: 5, targetHr: 140 })
    expect(plan.intake.level).toBe('none')
    expect(plan.schedule).toEqual([])
    expect(plan.minutesUntilLow).toBeNull()
    expect(plan.carbLoadPerDayG).toBeNull()
  })

  it('adds climbing to the energy cost and heat to the fluids', () => {
    const flat = planFueling(marathon)
    const hillyHot = planFueling({ ...marathon, elevationGainM: 500, temperatureC: 27 })
    expect(hillyHot.kcalTotal - flat.kcalTotal).toBe(350)
    expect(hillyHot.fluidsMlPerHour).toBeGreaterThan(flat.fluidsMlPerHour)
    expect(hillyHot.sodiumMgPerHour).toBeGreaterThan(flat.sodiumMgPerHour)
  })

  it('spaces gels evenly', () => {
    const stops = buildSchedule(120, 330, 60, 25)
    expect(stops.map((s) => s.minute)).toEqual([20, 45, 70, 95])
    expect(stops[1]!.km).toBe(8.2)
  })

  it('parses and formats times', () => {
    expect(parsePaceInput('5:30')).toBe(330)
    expect(parsePaceInput('5:75')).toBeNull()
    expect(formatClockMinutes(211.0)).toBe('3:31')
  })
})
