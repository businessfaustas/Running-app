import type { ListSlotsQuery, SlotSummary } from '@pacemates/shared'
import { and, asc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/client'
import { profiles, slotParticipants, workoutSlots } from '../db/schema'

const participantCount = sql<number>`(
  select count(*)::int from ${slotParticipants}
  where ${slotParticipants.slotId} = ${workoutSlots.id}
    and ${slotParticipants.status} = 'ACCEPTED'
)`

/** Postgres `time` comes back as `HH:mm:ss`; the API speaks `HH:mm`. */
const toHHmm = (time: string) => time.slice(0, 5)

export async function listSlots(query: ListSlotsQuery): Promise<SlotSummary[]> {
  const filters: SQL[] = [gte(workoutSlots.date, query.from), lte(workoutSlots.date, query.to)]
  if (query.sport?.length) filters.push(inArray(workoutSlots.sportType, query.sport))
  if (query.lat !== undefined && query.lng !== undefined) {
    filters.push(sql`ST_DWithin(
      ${workoutSlots.location}::geography,
      ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography,
      ${query.radiusKm * 1000}
    )`)
  }

  const rows = await db
    .select({
      slot: workoutSlots,
      host: { id: profiles.id, name: profiles.name, avatarUrl: profiles.avatarUrl },
      participantCount,
    })
    .from(workoutSlots)
    .innerJoin(profiles, eq(profiles.id, workoutSlots.hostId))
    .where(and(...filters))
    .orderBy(asc(workoutSlots.date), asc(workoutSlots.startTime))

  return rows.map(({ slot, host, participantCount }) => ({
    id: slot.id,
    title: slot.title,
    sportType: slot.sportType,
    date: slot.date,
    startTime: toHHmm(slot.startTime),
    endTime: slot.endTime ? toHHmm(slot.endTime) : null,
    distanceKm: slot.distanceKm,
    targetPace: slot.targetPace,
    vibeTag: slot.vibeTag,
    meetingPoint: { name: slot.meetingPointName, lat: slot.location.lat, lng: slot.location.lng },
    maxParticipants: slot.maxParticipants,
    status: slot.status,
    host,
    participantCount,
    // Who joined is visible only to the workout's own members, never on a public listing.
    participantPreview: [],
  }))
}
