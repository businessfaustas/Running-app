import {
  PARTICIPANT_STATUSES,
  RACE_POST_TOPICS,
  SLOT_STATUSES,
  SPORT_DISCIPLINES,
  SPORT_TYPES,
  VIBE_TAGS,
  type DefaultPaces,
} from '@pacemates/shared'
import { sql } from 'drizzle-orm'
import {
  check,
  date,
  type AnyPgColumn,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { authUsers } from 'drizzle-orm/supabase'
import { pointGeometry } from './postgis'

/*
 * Source of truth for the `public` schema. `pnpm db:generate` diffs this file into
 * supabase/migrations. Triggers, RLS policies and the Realtime publication live in the
 * hand-written custom migration that follows the generated one.
 */

export const sportType = pgEnum('sport_type', SPORT_TYPES)
export const sportDiscipline = pgEnum('sport_discipline', SPORT_DISCIPLINES)
export const vibeTag = pgEnum('vibe_tag', VIBE_TAGS)
export const slotStatus = pgEnum('slot_status', SLOT_STATUSES)
export const participantStatus = pgEnum('participant_status', PARTICIPANT_STATUSES)
export const racePostTopic = pgEnum('race_post_topic', RACE_POST_TOPICS)

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

/** One row per Supabase Auth user, created by the `on_auth_user_created` trigger. */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    sports: sportDiscipline('sports')
      .array()
      .notNull()
      .default(sql`'{}'`),
    defaultPaces: jsonb('default_paces').$type<DefaultPaces>().notNull().default({}),
    stravaId: text('strava_id').unique(),
    /** Home town id from packages/shared/src/cities.ts; the app shows workouts around it. */
    city: text('city'),
    /** Set when the athlete finishes (or skips) onboarding; null shows the onboarding flow. */
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check('profiles_name_length', sql`char_length(${t.name}) between 1 and 80`),
    check('profiles_bio_length', sql`${t.bio} is null or char_length(${t.bio}) <= 280`),
    check(
      'profiles_strava_id_format',
      sql`${t.stravaId} is null or ${t.stravaId} ~ '^[0-9]{1,20}$'`,
    ),
    check('profiles_city_id', sql`${t.city} is null or ${t.city} ~ '^[a-z]{3,24}$'`),
    check(
      'profiles_avatar_url_https',
      sql`${t.avatarUrl} is null or (${t.avatarUrl} like 'https://%' and char_length(${t.avatarUrl}) <= 500)`,
    ),
  ],
)

/** A planned workout ("Beacon") posted as an open invitation. */
export const workoutSlots = pgTable(
  'workout_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostId: uuid('host_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sportType: sportType('sport_type').notNull(),
    /** Local calendar date and wall-clock times at the meeting point. */
    date: date('date', { mode: 'string' }).notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time'),
    distanceKm: doublePrecision('distance_km').notNull(),
    /** Display string: "5:15–5:30 /km" for runs, "28 km/h" for rides. */
    targetPace: text('target_pace').notNull(),
    vibeTag: vibeTag('vibe_tag').notNull(),
    /** The host's notes: route, what to bring, where exactly to wait. */
    description: text('description'),
    meetingPointName: text('meeting_point_name').notNull(),
    location: pointGeometry('location').notNull(),
    /** Max group size including the host; null = unlimited. */
    maxParticipants: integer('max_participants'),
    status: slotStatus('status').notNull().default('OPEN'),
    ...timestamps,
  },
  (t) => [
    index('workout_slots_date_start_idx').on(t.date, t.startTime),
    index('workout_slots_host_idx').on(t.hostId),
    // Radius searches run on `location::geography` (metres), so index that expression.
    index('workout_slots_location_geog_idx').using('gist', sql`(${t.location}::geography)`),
    check('workout_slots_title_length', sql`char_length(${t.title}) between 1 and 120`),
    check('workout_slots_distance_positive', sql`${t.distanceKm} > 0`),
    check('workout_slots_distance_max', sql`${t.distanceKm} <= 400`),
    check('workout_slots_target_pace_length', sql`char_length(${t.targetPace}) between 1 and 40`),
    check(
      'workout_slots_meeting_point_length',
      sql`char_length(${t.meetingPointName}) between 2 and 120`,
    ),
    check(
      'workout_slots_description_length',
      sql`${t.description} is null or char_length(${t.description}) <= 1000`,
    ),
    check(
      'workout_slots_end_after_start',
      sql`${t.endTime} is null or ${t.endTime} > ${t.startTime}`,
    ),
    check(
      'workout_slots_max_participants_min',
      sql`${t.maxParticipants} is null or ${t.maxParticipants} >= 2`,
    ),
  ],
)

/** Attendance. The host is inserted automatically as ACCEPTED when a slot is created. */
export const slotParticipants = pgTable(
  'slot_participants',
  {
    slotId: uuid('slot_id')
      .notNull()
      .references(() => workoutSlots.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: participantStatus('status').notNull().default('ACCEPTED'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.slotId, t.userId] }),
    index('slot_participants_user_idx').on(t.userId),
  ],
)

/** Group chat for a slot, streamed to accepted participants over Supabase Realtime. */
export const slotMessages = pgTable(
  'slot_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slotId: uuid('slot_id')
      .notNull()
      .references(() => workoutSlots.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('slot_messages_slot_created_idx').on(t.slotId, t.createdAt),
    // Rate limiting counts a sender's recent messages.
    index('slot_messages_sender_created_idx').on(t.senderId, t.createdAt),
    check('slot_messages_content_length', sql`char_length(${t.content}) between 1 and 2000`),
  ],
)

/*
 * Races come from the curated calendar in packages/shared/src/races.ts; the database only
 * stores what people add to them, keyed by the race's slug.
 */
const raceSlugCheck = (column: AnyPgColumn) => sql`${column} ~ '^[a-z0-9-]{3,80}$'`

/** Who's going to which race (and which course). */
export const raceAttendees = pgTable(
  'race_attendees',
  {
    raceSlug: text('race_slug').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    distanceKm: doublePrecision('distance_km'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.raceSlug, t.userId] }),
    index('race_attendees_user_idx').on(t.userId),
    check('race_attendees_slug_format', raceSlugCheck(t.raceSlug)),
    check(
      'race_attendees_distance_range',
      sql`${t.distanceKm} is null or (${t.distanceKm} > 0 and ${t.distanceKm} <= 400)`,
    ),
  ],
)

/** The race forum: top-level posts and one level of replies. */
export const racePosts = pgTable(
  'race_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceSlug: text('race_slug').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => racePosts.id, {
      onDelete: 'cascade',
    }),
    topic: racePostTopic('topic').notNull().default('GENERAL'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('race_posts_race_created_idx').on(t.raceSlug, t.createdAt),
    index('race_posts_author_created_idx').on(t.authorId, t.createdAt),
    index('race_posts_parent_idx').on(t.parentId),
    check('race_posts_slug_format', raceSlugCheck(t.raceSlug)),
    check('race_posts_content_length', sql`char_length(${t.content}) between 1 and 2000`),
  ],
)
