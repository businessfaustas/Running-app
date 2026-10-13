import type { SportType, VibeTag } from '@grouppace/shared'
import {
  Bike,
  Coffee,
  Footprints,
  Gauge,
  MessagesSquare,
  Mountain,
  Repeat,
  Route,
  Timer,
  type LucideIcon,
} from 'lucide-react'

interface SportMeta {
  label: string
  /** Noun for sentences: "a run", "a ride". */
  noun: string
  Icon: LucideIcon
  /** CSS colour used as the card/pin accent (exposed to Tailwind as `--accent`). */
  accent: string
  /** Pace for runs, speed for rides. */
  measure: 'pace' | 'speed'
}

export const SPORT_META: Record<SportType, SportMeta> = {
  RUN: {
    label: 'Run',
    noun: 'run',
    Icon: Footprints,
    accent: 'var(--color-volt)',
    measure: 'pace',
  },
  TRACK: {
    label: 'Track',
    noun: 'track session',
    Icon: Timer,
    accent: 'var(--color-ice)',
    measure: 'pace',
  },
  CYCLING: {
    label: 'Road ride',
    noun: 'ride',
    Icon: Bike,
    accent: 'var(--color-blaze)',
    measure: 'speed',
  },
  GRAVEL: {
    label: 'Gravel',
    noun: 'gravel ride',
    Icon: Mountain,
    accent: 'var(--color-dune)',
    measure: 'speed',
  },
}

export const SPORT_ORDER: SportType[] = ['RUN', 'TRACK', 'CYCLING', 'GRAVEL']

export const SPORT_FILTERS = [
  { id: 'ALL', label: 'All', sports: null },
  { id: 'RUN', label: 'Run', sports: ['RUN', 'TRACK'] },
  { id: 'RIDE', label: 'Ride', sports: ['CYCLING', 'GRAVEL'] },
] as const satisfies readonly { id: string; label: string; sports: readonly SportType[] | null }[]

export type SportFilter = (typeof SPORT_FILTERS)[number]['id']

export function matchesSportFilter(sport: SportType, filter: SportFilter): boolean {
  const { sports } = SPORT_FILTERS.find((f) => f.id === filter)!
  return sports === null || (sports as readonly SportType[]).includes(sport)
}

export const VIBE_META: Record<VibeTag, { label: string; Icon: LucideIcon; blurb: string }> = {
  ZONE_2_COFFEE: {
    label: 'Easy + coffee',
    Icon: Coffee,
    blurb: 'Conversational pace, coffee afterwards',
  },
  SOCIAL_CHAT: { label: 'Social', Icon: MessagesSquare, blurb: 'Relaxed, nobody gets dropped' },
  PACE_PUSH: { label: 'Pace push', Icon: Gauge, blurb: 'Working hard at a set pace' },
  LONG_RUN: { label: 'Long one', Icon: Route, blurb: 'Steady miles, time on feet' },
  INTERVALS: { label: 'Intervals', Icon: Repeat, blurb: 'Reps with recovery between' },
}

export const VIBE_ORDER: VibeTag[] = [
  'ZONE_2_COFFEE',
  'SOCIAL_CHAT',
  'LONG_RUN',
  'PACE_PUSH',
  'INTERVALS',
]
