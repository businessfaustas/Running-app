import type { SportType, VibeTag } from '@pacemates/shared'

export const PHOTOS = {
  runCoast: '/photos/run-coast.webp',
  runCrew: '/photos/run-crew.webp',
  runCity: '/photos/run-city.webp',
  rideGroup: '/photos/ride-group.webp',
  gravel: '/photos/gravel.webp',
  track: '/photos/track.webp',
  trailForest: '/photos/trail-forest.webp',
  hikeForest: '/photos/hike-forest.webp',
} as const

/** Each sport's own photo; runs pick between two by vibe. */
const SPORT_PHOTO: Partial<Record<SportType, string>> = {
  CYCLING: PHOTOS.rideGroup,
  GRAVEL: PHOTOS.gravel,
  TRACK: PHOTOS.track,
  TRAIL: PHOTOS.trailForest,
  HIKING: PHOTOS.hikeForest,
}

/**
 * Header photo for a workout. Every sport has its own; runs get the city crew for social ones
 * and the coast for hard ones. Swims have no photo yet – they get the sport's colour and icon
 * instead (SportArt).
 */
export function photoFor(sport: SportType, vibe: VibeTag): string | null {
  if (sport === 'RUN') {
    return vibe === 'SOCIAL_CHAT' || vibe === 'ZONE_2_COFFEE' ? PHOTOS.runCity : PHOTOS.runCoast
  }
  return SPORT_PHOTO[sport] ?? null
}
