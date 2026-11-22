import {
  buildIcs,
  dayName,
  type PlanWeek,
  type TrainingPlan,
  type UserSlot,
} from '@pacemates/shared'
import { addDays } from '@pacemates/shared'
import { SPORT_META } from '../slots/meta'

/** Upcoming workouts as a calendar file. UIDs are the workout ids, so re-importing updates them. */
export function icsForWorkouts(items: UserSlot[]): string {
  return buildIcs(
    items.map(({ slot }) => ({
      uid: `${slot.id}@pacemates`,
      title: `${slot.title} (${SPORT_META[slot.sportType].label})`,
      description: `${slot.distanceKm} km · ${slot.targetPace} · organizuoja ${slot.host.name}`,
      location: slot.meetingPoint.name,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
    { name: 'PaceMates treniruotės' },
  )
}

const KIND_LABEL: Record<string, string> = {
  easy: 'Lengvai',
  long: 'Ilgasis',
  tempo: 'Tempas',
  intervals: 'Intervalai',
  strides: 'Pagreitėjimai',
  race: 'STARTAS',
}

/** A whole training plan as all-day events, one per training day. Needs the plan to have dates. */
export function icsForPlan(plan: TrainingPlan, raceName: string, raceSlug: string): string | null {
  const events = plan.weeks.flatMap((week: PlanWeek) =>
    week.starts
      ? week.sessions
          .filter((s) => s.kind !== 'rest')
          .map((s) => ({
            uid: `plan-${raceSlug}-${plan.distanceKm}-w${week.week}-d${s.day}@pacemates`,
            title:
              `${KIND_LABEL[s.kind] ?? ''}${s.km > 0 ? ` ${s.km} km` : ''} · ${raceName}`.trim(),
            description: `${dayName(s.day)}, ${week.week}-a savaitė. ${s.note}`,
            date: addDays(week.starts!, s.day),
          }))
      : [],
  )
  return events.length > 0 ? buildIcs(events, { name: `Pasiruošimas: ${raceName}` }) : null
}
