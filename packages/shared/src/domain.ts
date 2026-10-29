/**
 * Core domain vocabulary shared by the web app, the API and the database schema.
 * The `as const` tuples are the single source of truth for the Postgres enums.
 */

export const SPORT_TYPES = ['RUN', 'CYCLING', 'GRAVEL', 'TRACK'] as const
export type SportType = (typeof SPORT_TYPES)[number]

/** Disciplines a user can list on their profile (coarser than SportType). */
export const SPORT_DISCIPLINES = ['running', 'cycling'] as const
export type SportDiscipline = (typeof SPORT_DISCIPLINES)[number]

export const VIBE_TAGS = [
  'ZONE_2_COFFEE',
  'PACE_PUSH',
  'SOCIAL_CHAT',
  'LONG_RUN',
  'INTERVALS',
] as const
export type VibeTag = (typeof VIBE_TAGS)[number]

export const SLOT_STATUSES = ['OPEN', 'FULL', 'COMPLETED', 'CANCELLED'] as const
export type SlotStatus = (typeof SLOT_STATUSES)[number]

export const PARTICIPANT_STATUSES = ['ACCEPTED', 'PENDING'] as const
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number]

/** Free-form pace/speed defaults, e.g. `{ running_easy: "5:30/km", cycling_avg: "28 km/h" }`. */
export type DefaultPaces = Partial<
  Record<'running_easy' | 'running_tempo' | 'cycling_avg' | 'gravel_avg', string>
>

export interface UserSummary {
  id: string
  name: string
  avatarUrl: string | null
}

export interface Profile extends UserSummary {
  bio: string | null
  sports: SportDiscipline[]
  defaultPaces: DefaultPaces
  stravaId: string | null
  /** Home town id (see cities.ts); null until chosen. */
  city: string | null
  /** False until the athlete finishes (or skips) the onboarding steps after signing up. */
  onboarded: boolean
}

/** Dates are local calendar dates (`YYYY-MM-DD`), times are local wall-clock `HH:mm`. */
export interface SlotSummary {
  id: string
  title: string
  sportType: SportType
  date: string
  startTime: string
  /** Estimated finish; `null` when the host didn't give one. */
  endTime: string | null
  distanceKm: number
  targetPace: string
  vibeTag: VibeTag
  meetingPoint: {
    name: string
    lat: number
    lng: number
  }
  /** Max group size including the host; `null` means unlimited. */
  maxParticipants: number | null
  status: SlotStatus
  host: UserSummary
  /** Accepted participants, host included. */
  participantCount: number
  /** Up to three accepted participants other than the host, earliest joiners first. */
  participantPreview: UserSummary[]
}

export interface Participant extends UserSummary {
  status: ParticipantStatus
  /** ISO timestamp. */
  joinedAt: string
  isHost: boolean
  defaultPaces: DefaultPaces
}

export interface SlotDetail extends SlotSummary {
  description: string | null
  /** Host first, then everyone else in join order. */
  participants: Participant[]
}

/** A slot as seen from one user's calendar. */
export interface UserSlot {
  slot: SlotSummary
  role: 'HOST' | 'PARTICIPANT'
}

export interface ChatMessage {
  id: string
  slotId: string
  sender: UserSummary
  content: string
  /** ISO timestamp. */
  createdAt: string
}

export interface ChatThread {
  slot: SlotSummary
  lastMessage: ChatMessage | null
}

export interface NewSlotInput {
  title: string
  sportType: SportType
  date: string
  startTime: string
  endTime: string | null
  distanceKm: number
  targetPace: string
  vibeTag: VibeTag
  description: string | null
  meetingPoint: { name: string; lat: number; lng: number }
  maxParticipants: number | null
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    'name' | 'bio' | 'sports' | 'defaultPaces' | 'stravaId' | 'avatarUrl' | 'city' | 'onboarded'
  >
>

/** A circle on the map: a town's centre and how far around it counts. */
export interface Area {
  lat: number
  lng: number
  radiusKm: number
}

/** One athlete's totals over a period, from finished PaceMates workouts they took part in. */
export interface LeaderboardEntry {
  user: UserSummary
  /** Kilometres from RUN and TRACK workouts. */
  runKm: number
  /** Kilometres from CYCLING and GRAVEL workouts. */
  rideKm: number
  workouts: number
  hosted: number
}

// ─── Clubs (the directory of local running, triathlon and cycling clubs) ──────

export const CLUB_TYPES = ['RUNNING', 'TRIATHLON', 'CYCLING'] as const
export type ClubType = (typeof CLUB_TYPES)[number]

/** A club from the curated directory (packages/shared/src/clubs.ts). */
export interface Club {
  slug: string
  name: string
  types: ClubType[]
  /** Town name as in cities.ts, e.g. "Klaipėda". */
  city: string
  description: string
  /** Regular open sessions, e.g. "Antradieniais 19:00 – intervalai stadione". */
  schedule: string[]
  meetingPlace: string | null
  level: string | null
  membership: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  strava: string | null
  /** The club's public organisational address, if it publishes one. */
  email: string | null
  founded: number | null
  location: { lat: number; lng: number }
  /** Square logo under apps/web/public/clubs, for clubs that have given us one. */
  logo?: string
}

// ─── Races (the Lithuanian race calendar and its community) ────────────────────

export const RACE_TYPES = ['ROAD', 'TRAIL', 'ULTRA', 'CYCLING', 'TRIATHLON'] as const
export type RaceType = (typeof RACE_TYPES)[number]

export const RACE_SURFACES = [
  'asphalt',
  'gravel',
  'forest',
  'sand',
  'dunes',
  'hills',
  'roots',
  'mud',
  'cobbles',
  'trail',
  'coast',
  'night',
  'swim',
  'bike',
] as const
export type RaceSurface = (typeof RACE_SURFACES)[number]

/** A race from the curated calendar (packages/shared/src/races.ts). */
export interface Race {
  /** Stable id, also used in URLs and by posts/attendance in the database. */
  slug: string
  name: string
  /** Confirmed date of the next edition, or null while it isn't announced. */
  date: string | null
  /** The month it's usually held (1–12), used for sorting and as a hint until confirmed. */
  typicalMonth: number
  city: string
  region: string
  start: { lat: number; lng: number }
  type: RaceType
  /** Course options in km, longest first. */
  distances: number[]
  surface: RaceSurface[]
  elevationGainM: number | null
  website: string | null
  description: string
  tips: string[]
}

export const RACE_POST_TOPICS = ['TIP', 'QUESTION', 'GEAR', 'LOGISTICS', 'GENERAL'] as const
export type RacePostTopic = (typeof RACE_POST_TOPICS)[number]

export interface RacePost {
  id: string
  raceSlug: string
  /** Replies point at their top-level post; threads are one level deep. */
  parentId: string | null
  topic: RacePostTopic
  content: string
  /** ISO timestamp. */
  createdAt: string
  author: UserSummary
}

export interface NewRacePost {
  topic: RacePostTopic
  content: string
  parentId: string | null
}

export interface RaceAttendee extends UserSummary {
  /** Which course they're running, if they said. */
  distanceKm: number | null
  /** ISO timestamp. */
  joinedAt: string
}

/** A race someone has said they're going to. */
export interface UserRace {
  raceSlug: string
  distanceKm: number | null
}
