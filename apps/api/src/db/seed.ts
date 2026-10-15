import { addDays, toISODate } from '@pacemates/shared'
import {
  MOCK_MESSAGES,
  MOCK_RACE_ATTENDEES,
  MOCK_RACE_POSTS,
  MOCK_SLOTS,
  MOCK_USERS,
} from '@pacemates/shared/mock'
import { eq, inArray, sql } from 'drizzle-orm'
import { db, queryClient } from './client'
import {
  profiles,
  raceAttendees,
  racePosts,
  slotMessages,
  slotParticipants,
  workoutSlots,
} from './schema'

/*
 * Loads the shared mock athletes and workouts, dated relative to today. Safe to re-run:
 * mock users are upserted and mock slots are replaced. Writes to auth.users directly, so it
 * needs a privileged connection (local Supabase / service connection string).
 */

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed mock data with NODE_ENV=production')
}

const today = toISODate(new Date())

await db.transaction(async (tx) => {
  for (const user of MOCK_USERS) {
    const email = `${user.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z]+/g, '.')}@example.com`
    await tx.execute(sql`
      insert into auth.users (
        instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', ${user.id}, 'authenticated', 'authenticated', ${email},
        '{"provider":"email","providers":["email"]}', ${JSON.stringify({ name: user.name })}::jsonb,
        now(), now(), '', '', '', ''
      )
      on conflict (id) do nothing`)
  }

  // handle_new_user() created bare profiles; fill in the details.
  for (const { id, onboarded: _, ...details } of MOCK_USERS) {
    const profile = { ...details, onboardedAt: new Date() }
    await tx
      .insert(profiles)
      .values({ id, ...profile })
      .onConflictDoUpdate({ target: profiles.id, set: profile })
  }

  await tx.delete(workoutSlots).where(
    inArray(
      workoutSlots.id,
      MOCK_SLOTS.map((slot) => slot.id),
    ),
  )

  for (const mock of MOCK_SLOTS) {
    await tx.insert(workoutSlots).values({
      id: mock.id,
      hostId: mock.hostId,
      title: mock.title,
      sportType: mock.sportType,
      date: addDays(today, mock.dayOffset),
      startTime: mock.startTime,
      endTime: mock.endTime,
      distanceKm: mock.distanceKm,
      targetPace: mock.targetPace,
      vibeTag: mock.vibeTag,
      description: mock.description,
      meetingPointName: mock.meetingPoint.name,
      location: { lng: mock.meetingPoint.lng, lat: mock.meetingPoint.lat },
      maxParticipants: mock.maxParticipants,
    })

    // The host was added by trigger; add everyone else in join order.
    if (mock.participantIds.length > 0) {
      await tx.insert(slotParticipants).values(
        mock.participantIds.map((userId, i) => ({
          slotId: mock.id,
          userId,
          joinedAt: new Date(Date.now() - (mock.participantIds.length - i) * 60_000),
        })),
      )
    }

    // OPEN/FULL is derived by triggers; terminal states are set explicitly.
    if (mock.status === 'CANCELLED' || mock.status === 'COMPLETED') {
      await tx.update(workoutSlots).set({ status: mock.status }).where(eq(workoutSlots.id, mock.id))
    }
  }

  // Chat history (replaced along with the slots, which cascade to their messages).
  await tx.insert(slotMessages).values(
    MOCK_MESSAGES.map((m) => ({
      slotId: m.slotId,
      senderId: m.senderId,
      content: m.content,
      createdAt: new Date(Date.now() - m.minutesAgo * 60_000),
    })),
  )

  // Race community: who's going where, and a few forum threads. Replaced on each run.
  await tx.delete(raceAttendees).where(
    inArray(
      raceAttendees.userId,
      MOCK_USERS.map((u) => u.id),
    ),
  )
  await tx.delete(racePosts).where(
    inArray(
      racePosts.id,
      MOCK_RACE_POSTS.map((p) => p.id),
    ),
  )
  await tx.insert(raceAttendees).values(
    MOCK_RACE_ATTENDEES.map((a) => ({
      raceSlug: a.raceSlug,
      userId: a.userId,
      distanceKm: a.distanceKm,
      createdAt: new Date(Date.now() - a.daysAgo * 86_400_000),
    })),
  )
  // Threads before their replies, which the parent check requires.
  const ordered = [...MOCK_RACE_POSTS].sort(
    (a, b) => Number(a.parentId !== null) - Number(b.parentId !== null),
  )
  await tx.insert(racePosts).values(
    ordered.map((p) => ({
      id: p.id,
      raceSlug: p.raceSlug,
      authorId: p.authorId,
      parentId: p.parentId,
      topic: p.topic,
      content: p.content,
      createdAt: new Date(Date.now() - p.minutesAgo * 60_000),
    })),
  )
})

console.log(
  `Seeded ${MOCK_USERS.length} athletes, ${MOCK_SLOTS.length} workouts, ${MOCK_MESSAGES.length} messages and ${MOCK_RACE_POSTS.length} race posts around ${today}.`,
)
await queryClient.end()
