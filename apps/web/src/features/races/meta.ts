import type { RacePostTopic, RaceSurface, RaceType } from '@pacemates/shared'
import {
  Bike,
  CircleHelp,
  Footprints,
  Lightbulb,
  MapPinned,
  MessageCircle,
  Mountain,
  Shirt,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react'

export const RACE_TYPE_META: Record<RaceType, { label: string; Icon: LucideIcon; accent: string }> =
  {
    ROAD: { label: 'Plentas', Icon: Footprints, accent: 'var(--color-volt)' },
    TRAIL: { label: 'Trail', Icon: Trees, accent: 'var(--color-dune)' },
    ULTRA: { label: 'Ultra', Icon: Mountain, accent: 'var(--color-blaze)' },
    CYCLING: { label: 'Dviratis', Icon: Bike, accent: 'var(--color-ice)' },
    TRIATHLON: { label: 'Triatlonas', Icon: Waves, accent: '#c4a1ff' },
  }

export const RACE_FILTERS = [
  { id: 'ALL', label: 'Visos', types: null },
  { id: 'ROAD', label: 'Plentas', types: ['ROAD'] },
  { id: 'TRAIL', label: 'Trail ir ultra', types: ['TRAIL', 'ULTRA'] },
  { id: 'CYCLING', label: 'Dviračiai', types: ['CYCLING'] },
  { id: 'TRIATHLON', label: 'Triatlonas', types: ['TRIATHLON'] },
] as const satisfies readonly { id: string; label: string; types: readonly RaceType[] | null }[]

export type RaceFilter = (typeof RACE_FILTERS)[number]['id'] | 'MINE'

export const TOPIC_META: Record<RacePostTopic, { label: string; Icon: LucideIcon; tone: string }> =
  {
    TIP: { label: 'Patarimas', Icon: Lightbulb, tone: 'bg-volt text-black' },
    QUESTION: { label: 'Klausimas', Icon: CircleHelp, tone: 'bg-ice/20 text-ice' },
    GEAR: { label: 'Ekipiruotė', Icon: Shirt, tone: 'bg-dune/20 text-dune' },
    LOGISTICS: { label: 'Logistika', Icon: MapPinned, tone: 'bg-blue/30 text-[#9db4ff]' },
    GENERAL: { label: 'Bendra', Icon: MessageCircle, tone: 'bg-white/10 text-slate-200' },
  }

export const TOPIC_ORDER: RacePostTopic[] = ['TIP', 'QUESTION', 'GEAR', 'LOGISTICS', 'GENERAL']

export const SURFACE_LABEL: Record<RaceSurface, string> = {
  asphalt: 'Asfaltas',
  gravel: 'Žvyras',
  forest: 'Miškas',
  sand: 'Smėlis',
  dunes: 'Kopos',
  hills: 'Kalvos',
  roots: 'Šaknys',
  mud: 'Purvas',
  cobbles: 'Grindinys',
  trail: 'Takai',
  coast: 'Pajūris',
  night: 'Naktis',
  swim: 'Plaukimas',
  bike: 'Dviratis',
}
