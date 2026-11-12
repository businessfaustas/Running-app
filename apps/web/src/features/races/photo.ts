import type { Race } from '@pacemates/shared'
import { PHOTOS } from '../../lib/photos'

/** Header photo for a race: the forest for trails, the city crowd for road runs. */
export function racePhoto(race: Race): string {
  if (race.type === 'CYCLING' || race.type === 'TRIATHLON') return PHOTOS.rideGroup
  if (race.type === 'ROAD') return PHOTOS.runCity
  return PHOTOS.trailForest
}
