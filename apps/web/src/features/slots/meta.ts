import type { SportType, VibeTag } from '@pacemates/shared'
import {
  Backpack,
  Bike,
  Coffee,
  Footprints,
  Gauge,
  MessagesSquare,
  Mountain,
  Repeat,
  Route,
  Timer,
  TreePine,
  Waves,
  type LucideIcon,
} from 'lucide-react'

interface SportMeta {
  label: string
  Icon: LucideIcon
  /** CSS colour used as the card/pin accent (exposed to Tailwind as `--accent`). */
  accent: string
  /** Pace per km for runs, speed for rides and hikes, pace per 100 m for swims. */
  measure: 'pace' | 'speed' | 'swim'
}

export const SPORT_META: Record<SportType, SportMeta> = {
  RUN: { label: 'Bėgimas', Icon: Footprints, accent: 'var(--color-volt)', measure: 'pace' },
  TRACK: { label: 'Stadionas', Icon: Timer, accent: 'var(--color-ice)', measure: 'pace' },
  CYCLING: { label: 'Plentas', Icon: Bike, accent: 'var(--color-blaze)', measure: 'speed' },
  GRAVEL: { label: 'Žvyrkelis', Icon: Mountain, accent: 'var(--color-dune)', measure: 'speed' },
  TRAIL: { label: 'Trail', Icon: TreePine, accent: 'var(--color-moss)', measure: 'pace' },
  HIKING: { label: 'Žygis', Icon: Backpack, accent: 'var(--color-lilac)', measure: 'speed' },
  SWIMMING: { label: 'Plaukimas', Icon: Waves, accent: 'var(--color-aqua)', measure: 'swim' },
}

export const SPORT_ORDER: SportType[] = [
  'RUN',
  'TRAIL',
  'TRACK',
  'CYCLING',
  'GRAVEL',
  'HIKING',
  'SWIMMING',
]

export const SPORT_FILTERS = [
  { id: 'ALL', label: 'Visi', sports: null },
  { id: 'RUN', label: 'Bėgimas', sports: ['RUN', 'TRACK', 'TRAIL'] },
  { id: 'RIDE', label: 'Dviratis', sports: ['CYCLING', 'GRAVEL'] },
  { id: 'HIKE', label: 'Žygiai', sports: ['HIKING'] },
  { id: 'SWIM', label: 'Plaukimas', sports: ['SWIMMING'] },
] as const satisfies readonly { id: string; label: string; sports: readonly SportType[] | null }[]

export type SportFilter = (typeof SPORT_FILTERS)[number]['id']

export function matchesSportFilter(sport: SportType, filter: SportFilter): boolean {
  const { sports } = SPORT_FILTERS.find((f) => f.id === filter)!
  return sports === null || (sports as readonly SportType[]).includes(sport)
}

export const VIBE_META: Record<VibeTag, { label: string; Icon: LucideIcon; blurb: string }> = {
  ZONE_2_COFFEE: { label: 'Lengvai + kava', Icon: Coffee, blurb: 'Šnekamasis tempas, po to kava' },
  SOCIAL_CHAT: { label: 'Pabendrauti', Icon: MessagesSquare, blurb: 'Ramiai, niekas neatsilieka' },
  PACE_PUSH: { label: 'Tempas', Icon: Gauge, blurb: 'Dirbam stipriai nustatytu tempu' },
  LONG_RUN: { label: 'Ilgoji', Icon: Route, blurb: 'Tolygūs kilometrai, laikas ant kojų' },
  INTERVALS: { label: 'Intervalai', Icon: Repeat, blurb: 'Pakartojimai su poilsiu tarp jų' },
}

export const VIBE_ORDER: VibeTag[] = [
  'ZONE_2_COFFEE',
  'SOCIAL_CHAT',
  'LONG_RUN',
  'PACE_PUSH',
  'INTERVALS',
]
