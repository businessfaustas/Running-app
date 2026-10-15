import type {
  ChatMessage,
  ChatThread,
  NewRacePost,
  NewSlotInput,
  Profile,
  ProfileUpdate,
  RaceAttendee,
  RacePost,
  SlotDetail,
  SlotSummary,
  UserRace,
  UserSlot,
} from '@pacemates/shared'

export interface Session {
  userId: string
  email: string | null
}

/** What changed, for screens that care (the reset-password page waits for recovery). */
export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'USER_UPDATED' | 'OTHER'

/** Errors whose message is safe to show to the user as-is. */
export class BackendError extends Error {
  override name = 'BackendError'
}

export interface DateRange {
  from: string
  to: string
}

/**
 * Everything the app needs from a backend. `demo` keeps data on the device; `supabase`
 * talks to the shared database, so other people see your workouts and messages.
 */
export interface Backend {
  readonly mode: 'demo' | 'supabase'

  getSession(): Promise<Session | null>
  onAuthChange(listener: (session: Session | null, event: AuthEvent) => void): () => void
  signIn(credentials: { email: string; password: string }): Promise<void>
  /** `needsEmailConfirmation`: the account exists but the user must click the emailed link. */
  signUp(input: {
    name: string
    email: string
    password: string
  }): Promise<{ needsEmailConfirmation: boolean }>
  /** Sends the sign-up confirmation email again. */
  resendConfirmation(email: string): Promise<void>
  /**
   * Emails a link that opens /reset-password signed in for recovery. Succeeds whether or not
   * the address has an account, so the form can't be used to find out who's registered.
   */
  requestPasswordReset(email: string): Promise<void>
  /** New password for the signed-in user, including a password-recovery session. */
  updatePassword(password: string): Promise<void>
  /** Deletes the signed-in user's account and everything that belongs to it, then signs out. */
  deleteAccount(): Promise<void>
  /** Demo only: sign in as one of the sample athletes. */
  signInAsSample?: () => Promise<void>
  /** Demo only: forget everything saved on this device. */
  resetDemo?: () => Promise<void>
  signOut(): Promise<void>

  getProfile(userId: string): Promise<Profile | null>
  updateProfile(patch: ProfileUpdate): Promise<Profile>

  listSlots(range: DateRange): Promise<SlotSummary[]>
  getSlot(slotId: string): Promise<SlotDetail | null>
  /** Workouts the user hosts or has joined, oldest first. */
  listUserSlots(userId: string): Promise<UserSlot[]>
  createSlot(input: NewSlotInput): Promise<SlotSummary>
  cancelSlot(slotId: string): Promise<void>
  joinSlot(slotId: string): Promise<void>
  leaveSlot(slotId: string): Promise<void>

  listMessages(slotId: string): Promise<ChatMessage[]>
  sendMessage(slotId: string, content: string): Promise<ChatMessage>
  /** Calls `onChange` when a slot's chat gets new messages. */
  subscribeToMessages(slotId: string, onChange: () => void): () => void
  /** Chats for the workouts the signed-in user is part of. */
  listThreads(): Promise<ChatThread[]>
  /** Calls `onChange` when data changed somewhere else (another tab, another user). */
  subscribeToChanges(onChange: () => void): () => void

  /** How many people are going to each race, by race slug. */
  listRaceAttendance(): Promise<Record<string, number>>
  listRaceAttendees(raceSlug: string): Promise<RaceAttendee[]>
  listUserRaces(userId: string): Promise<UserRace[]>
  /** Mark the signed-in user as going (with an optional course), or null to stop going. */
  setRaceAttendance(
    raceSlug: string,
    attendance: { distanceKm: number | null } | null,
  ): Promise<void>
  /** A race's forum, oldest first; replies carry their parent's id. */
  listRacePosts(raceSlug: string): Promise<RacePost[]>
  createRacePost(raceSlug: string, post: NewRacePost): Promise<RacePost>
  deleteRacePost(postId: string): Promise<void>
  /** Calls `onChange` when a race's posts or attendance change. */
  subscribeToRace(raceSlug: string, onChange: () => void): () => void
}
