import type { ListSlotsQuery, SlotSummary, UserSummary } from '@pacemates/shared'
import { and, asc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '../db/client'
import { profiles, slotParticipants, workoutSlots } from '../db/schema'

const participantCount = sql<number>`(
  select count(*)::int from ${slotParticipants}
  where ${slotParticipants.slotId} = ${workoutSlots.id}
    and ${slotParticipants.status} = 'ACCEPTED'
)`

const participantPreview = sql<UserSummary[]>`(
  select coalesce(
    json_agg(json_build_object('id', x.id, 'name', x.name, 'avatarUrl', x.avatar_url) order by x.joined_at),
    '[]'::json
  )
  from (
    select p.id, p.name, p.avatar_url, sp.joined_at
    from ${slotParticipants} sp
    join ${profiles} p on p.id = sp.user_id
    where sp.slot_id = ${workoutSlots.id}
      and sp.status = 'ACCEPTED'
      and sp.user_id <> ${workoutSlots.hostId}
    order by sp.joined_at
    limit 3
  ) x
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
      participantPreview,
    })
    .from(workoutSlots)
    .innerJoin(profiles, eq(profiles.id, workoutSlots.hostId))
    .where(and(...filters))
    .orderBy(asc(workoutSlots.date), asc(workoutSlots.startTime))

  return rows.map(({ slot, host, participantCount, participantPreview }) => ({
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
    participantPreview,
  }))
}
