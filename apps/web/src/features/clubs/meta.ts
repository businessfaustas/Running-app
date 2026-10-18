import type { Club, ClubType } from '@pacemates/shared'
import { Bike, Footprints, Waves, type LucideIcon } from 'lucide-react'
import { PHOTOS } from '../../lib/photos'

export const CLUB_TYPE_META: Record<ClubType, { label: string; Icon: LucideIcon; accent: string }> =
  {
    RUNNING: { label: 'Bėgimas', Icon: Footprints, accent: 'var(--color-volt)' },
    TRIATHLON: { label: 'Triatlonas', Icon: Waves, accent: '#c4a1ff' },
    CYCLING: { label: 'Dviračiai', Icon: Bike, accent: 'var(--color-ice)' },
  }

export const CLUB_FILTERS: { id: ClubType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Visi' },
  { id: 'RUNNING', label: 'Bėgimas' },
  { id: 'TRIATHLON', label: 'Triatlonas' },
  { id: 'CYCLING', label: 'Dviračiai' },
]

export function clubPhoto(club: Club): string {
  if (club.types[0] === 'CYCLING') return PHOTOS.rideGroup
  if (club.types[0] === 'TRIATHLON') return PHOTOS.runCoast
  return PHOTOS.runCrew
}

/** Lowercase without diacritics, so "siauliu" finds "Šiaulių". */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
