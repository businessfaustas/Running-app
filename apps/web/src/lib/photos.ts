import type { SportType, VibeTag } from '@pacemates/shared'

export const PHOTOS = {
  runCoast: '/photos/run-coast.webp',
  runCrew: '/photos/run-crew.webp',
  rideGroup: '/photos/ride-group.webp',
} as const

/**
 * Header photo for a workout: the crew for social runs, the coast for hard ones. Hikes and
 * swims have no photo yet – they get the sport's colour and icon instead (SportArt).
 */
export function photoFor(sport: SportType, vibe: VibeTag): string | null {
  if (sport === 'HIKING' || sport === 'SWIMMING') return null
  if (sport === 'TRAIL') return PHOTOS.runCoast
  if (sport === 'CYCLING' || sport === 'GRAVEL') return PHOTOS.rideGroup
  return vibe === 'SOCIAL_CHAT' || vibe === 'ZONE_2_COFFEE' ? PHOTOS.runCrew : PHOTOS.runCoast
}
