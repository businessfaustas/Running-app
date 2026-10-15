import type { Race } from '@pacemates/shared'
import { PHOTOS } from '../../lib/photos'

/** Header photo for a race: coast and forest for trails, the crowd for city runs. */
export function racePhoto(race: Race): string {
  if (race.type === 'CYCLING' || race.type === 'TRIATHLON') return PHOTOS.rideGroup
  if (race.type === 'ROAD') return PHOTOS.runCrew
  return PHOTOS.runCoast
}
