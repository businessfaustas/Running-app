import type { NewSlotInput, SlotDetail } from '@pacemates/shared'
import { formatKm, longDay } from '../../lib/format'
import { SPORT_META, VIBE_META } from '../slots/meta'

/** What the host changed, in words for the group chat: ["vieta: Vingio parkas", …]. */
export function describeChanges(before: SlotDetail, after: NewSlotInput): string[] {
  const changes: string[] = []
  if (after.sportType !== before.sportType) {
    changes.push(`sportas: ${SPORT_META[after.sportType].label.toLowerCase()}`)
  }
  if (after.date !== before.date || after.startTime !== before.startTime) {
    changes.push(`pradžia: ${longDay(after.date).toLowerCase()}, ${after.startTime}`)
  } else if (after.endTime !== before.endTime) {
    changes.push(`pabaiga: ${after.endTime ?? 'nenurodyta'}`)
  }
  if (after.distanceKm !== before.distanceKm) {
    changes.push(`atstumas: ${formatKm(after.distanceKm)} km`)
  }
  if (after.targetPace !== before.targetPace) {
    const word = SPORT_META[after.sportType].measure === 'speed' ? 'greitis' : 'tempas'
    changes.push(`${word}: ${after.targetPace}`)
  }
  if (after.vibeTag !== before.vibeTag) {
    changes.push(`pobūdis: ${VIBE_META[after.vibeTag].label}`)
  }
  const moved =
    after.meetingPoint.lat !== before.meetingPoint.lat ||
    after.meetingPoint.lng !== before.meetingPoint.lng
  if (moved || after.meetingPoint.name.trim() !== before.meetingPoint.name) {
    changes.push(`vieta: ${after.meetingPoint.name.trim()}`)
  }
  if (after.maxParticipants !== before.maxParticipants) {
    changes.push(
      after.maxParticipants === null
        ? 'grupė: be apribojimų'
        : `grupė: iki ${after.maxParticipants} žm.`,
    )
  }
  if (after.title.trim() !== before.title) changes.push(`pavadinimas: „${after.title.trim()}“`)
  if ((after.description?.trim() || null) !== (before.description || null)) {
    changes.push('atnaujintos pastabos')
  }
  return changes
}
