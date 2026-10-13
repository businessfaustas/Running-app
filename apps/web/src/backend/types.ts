import type {
  ChatMessage,
  ChatThread,
  NewSlotInput,
  Profile,
  ProfileUpdate,
  SlotDetail,
  SlotSummary,
  UserSlot,
} from '@grouppace/shared'

export interface Session {
  userId: string
  email: string | null
}

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
  onAuthChange(listener: (session: Session | null) => void): () => void
  signIn(credentials: { email: string; password: string }): Promise<void>
  /** `needsEmailConfirmation`: the account exists but the user must click the emailed link. */
  signUp(input: {
    name: string
    email: string
    password: string
  }): Promise<{ needsEmailConfirmation: boolean }>
  /** Demo only: sign in as one of the sample athletes. */
  signInAsSample?: () => Promise<void>
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
}
