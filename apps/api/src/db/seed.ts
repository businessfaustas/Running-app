import { addDays, toISODate } from '@grouppace/shared'
import { MOCK_SLOTS, MOCK_USERS } from '@grouppace/shared/mock'
import { eq, inArray, sql } from 'drizzle-orm'
import { db, queryClient } from './client'
import { profiles, slotParticipants, workoutSlots } from './schema'

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
    const email = `${user.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`
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
  for (const { id, ...profile } of MOCK_USERS) {
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
})

console.log(
  `Seeded ${MOCK_USERS.length} athletes and ${MOCK_SLOTS.length} workouts around ${today}.`,
)
await queryClient.end()
