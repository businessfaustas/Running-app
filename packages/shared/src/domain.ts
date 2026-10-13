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
  Pick<Profile, 'name' | 'bio' | 'sports' | 'defaultPaces' | 'stravaId' | 'avatarUrl'>
>
