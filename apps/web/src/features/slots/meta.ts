import type { SportType, VibeTag } from '@grouppace/shared'
import { Bike, Footprints, Mountain, Timer, type LucideIcon } from 'lucide-react'

interface SportMeta {
  label: string
  Icon: LucideIcon
  /** CSS colour used as the card/pin accent (exposed to Tailwind as `--accent`). */
  accent: string
}

export const SPORT_META: Record<SportType, SportMeta> = {
  RUN: { label: 'Run', Icon: Footprints, accent: 'var(--color-volt)' },
  TRACK: { label: 'Track', Icon: Timer, accent: 'var(--color-ice)' },
  CYCLING: { label: 'Road ride', Icon: Bike, accent: 'var(--color-blaze)' },
  GRAVEL: { label: 'Gravel', Icon: Mountain, accent: 'var(--color-dune)' },
}

export const SPORT_FILTERS = [
  { id: 'ALL', label: 'All', sports: null },
  { id: 'RUN', label: 'Run', sports: ['RUN', 'TRACK'] },
  { id: 'BIKE', label: 'Bike', sports: ['CYCLING', 'GRAVEL'] },
] as const satisfies readonly { id: string; label: string; sports: readonly SportType[] | null }[]

export type SportFilter = (typeof SPORT_FILTERS)[number]['id']

export function matchesSportFilter(sport: SportType, filter: SportFilter): boolean {
  const { sports } = SPORT_FILTERS.find((f) => f.id === filter)!
  return sports === null || (sports as readonly SportType[]).includes(sport)
}

export const VIBE_META: Record<VibeTag, { emoji: string; label: string }> = {
  ZONE_2_COFFEE: { emoji: '☕', label: 'Zone 2 + Coffee' },
  PACE_PUSH: { emoji: '⏱️', label: 'Pace Push' },
  SOCIAL_CHAT: { emoji: '🗣️', label: 'Social' },
  LONG_RUN: { emoji: '🛣️', label: 'Long Run' },
  INTERVALS: { emoji: '🔁', label: 'Intervals' },
}
