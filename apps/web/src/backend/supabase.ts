import type {
  ChatMessage,
  ChatThread,
  Profile,
  SlotDetail,
  SlotSummary,
  UserSlot,
} from '@grouppace/shared'
import {
  createClient,
  type PostgrestError,
  type Session as AuthSession,
} from '@supabase/supabase-js'
import { BackendError, type Backend, type Session } from './types'

/*
 * Talks to Supabase directly from the browser. Row-level security in the database decides
 * what each user may read or write; the SQL functions in
 * supabase/migrations/*_app_functions.sql shape the JSON this file reads.
 */

interface ProfileRow {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  sports: Profile['sports']
  default_paces: Profile['defaultPaces']
  strava_id: string | null
}

interface MessageRow {
  id: string
  slot_id: string
  content: string
  created_at: string
  sender: { id: string; name: string; avatar_url: string | null } | null
}

const MESSAGE_COLUMNS = 'id, slot_id, content, created_at, sender:profiles(id, name, avatar_url)'

/** Database errors that are worth showing as they are, reworded for people. */
const FRIENDLY_ERRORS: [RegExp, string][] = [
  [/workout is full/i, 'This workout is full'],
  [/workout is cancelled/i, 'This workout was cancelled'],
  [/workout is completed/i, 'This workout already happened'],
  [/invalid login credentials/i, 'Wrong email or password'],
  [/email not confirmed/i, 'Confirm your email first: check your inbox for the link'],
  [/user already registered/i, 'There is already an account with that email'],
  [/password should be at least/i, 'Use at least 8 characters for the password'],
  [/row-level security/i, "You're not allowed to do that"],
]

function fail(error: PostgrestError | { message: string }): never {
  const friendly = FRIENDLY_ERRORS.find(([pattern]) => pattern.test(error.message))?.[1]
  throw new BackendError(friendly ?? error.message)
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  avatarUrl: row.avatar_url,
  bio: row.bio,
  sports: row.sports,
  defaultPaces: row.default_paces,
  stravaId: row.strava_id,
})

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  slotId: row.slot_id,
  content: row.content,
  createdAt: row.created_at,
  sender: row.sender
    ? { id: row.sender.id, name: row.sender.name, avatarUrl: row.sender.avatar_url }
    : { id: 'unknown', name: 'Someone', avatarUrl: null },
})

const toSession = (session: AuthSession | null): Session | null =>
  session ? { userId: session.user.id, email: session.user.email ?? null } : null

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const supabase = createClient(url, anonKey)

  async function requireUserId(): Promise<string> {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw new BackendError('Sign in to do that')
    return data.session.user.id
  }

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await supabase.auth.getSession()
      return toSession(data.session)
    },

    onAuthChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) =>
        listener(toSession(session)),
      )
      return () => data.subscription.unsubscribe()
    },

    async signIn({ email, password }) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) fail(error)
    },

    async signUp({ name, email, password }) {
      if (password.length < 8) throw new BackendError('Use at least 8 characters for the password')
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        // Read by the handle_new_user() trigger to name the profile.
        options: { data: { name: name.trim() } },
      })
      if (error) fail(error)
      return { needsEmailConfirmation: !data.session }
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) fail(error)
    },

    async getProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, bio, sports, default_paces, strava_id')
        .eq('id', userId)
        .maybeSingle<ProfileRow>()
      if (error) fail(error)
      return data ? toProfile(data) : null
    },

    async updateProfile(patch) {
      const userId = await requireUserId()
      const row: Partial<ProfileRow> = {}
      if (patch.name !== undefined) row.name = patch.name.trim()
      if (patch.bio !== undefined) row.bio = patch.bio
      if (patch.sports !== undefined) row.sports = patch.sports
      if (patch.defaultPaces !== undefined) row.default_paces = patch.defaultPaces
      if (patch.stravaId !== undefined) row.strava_id = patch.stravaId
      if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl
      if (row.name !== undefined && row.name.length < 2) throw new BackendError('Enter your name')
      const { data, error } = await supabase
        .from('profiles')
        .update(row)
        .eq('id', userId)
        .select('id, name, avatar_url, bio, sports, default_paces, strava_id')
        .single<ProfileRow>()
      if (error) fail(error)
      return toProfile(data)
    },

    async listSlots({ from, to }) {
      const { data, error } = await supabase.rpc('list_slots', { p_from: from, p_to: to })
      if (error) fail(error)
      return data as SlotSummary[]
    },

    async getSlot(slotId) {
      const { data, error } = await supabase.rpc('get_slot', { p_id: slotId })
      if (error) fail(error)
      return (data as SlotDetail | null) ?? null
    },

    async listUserSlots(userId) {
      const { data, error } = await supabase.rpc('list_user_slots', { p_user: userId })
      if (error) fail(error)
      return data as UserSlot[]
    },

    async createSlot(input) {
      await requireUserId()
      const { data, error } = await supabase.rpc('create_slot', { p: input })
      if (error) fail(error)
      return data as SlotSummary
    },

    async cancelSlot(slotId) {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('workout_slots')
        .update({ status: 'CANCELLED' })
        .eq('id', slotId)
        .eq('host_id', userId)
        .select('id')
      if (error) fail(error)
      if (data.length === 0) throw new BackendError('Only the host can cancel this workout')
    },

    async joinSlot(slotId) {
      const userId = await requireUserId()
      const { error } = await supabase
        .from('slot_participants')
        .upsert({ slot_id: slotId, user_id: userId }, { ignoreDuplicates: true })
      if (error) fail(error)
    },

    async leaveSlot(slotId) {
      const userId = await requireUserId()
      const { data: slot } = await supabase
        .from('workout_slots')
        .select('host_id')
        .eq('id', slotId)
        .maybeSingle<{ host_id: string }>()
      if (slot?.host_id === userId) {
        throw new BackendError("Hosts can't leave their own workout. Cancel it instead.")
      }
      const { error } = await supabase
        .from('slot_participants')
        .delete()
        .eq('slot_id', slotId)
        .eq('user_id', userId)
      if (error) fail(error)
    },

    async listMessages(slotId) {
      const { data, error } = await supabase
        .from('slot_messages')
        .select(MESSAGE_COLUMNS)
        .eq('slot_id', slotId)
        .order('created_at')
        .returns<MessageRow[]>()
      if (error) fail(error)
      return data.map(toMessage)
    },

    async sendMessage(slotId, content) {
      const userId = await requireUserId()
      const text = content.trim()
      if (text.length === 0) throw new BackendError('Write something first')
      const { data, error } = await supabase
        .from('slot_messages')
        .insert({ slot_id: slotId, sender_id: userId, content: text })
        .select(MESSAGE_COLUMNS)
        .single<MessageRow>()
      if (error) {
        if (/row-level security/i.test(error.message)) {
          throw new BackendError('Join the workout to post in the chat')
        }
        fail(error)
      }
      return toMessage(data)
    },

    subscribeToMessages(slotId, onChange) {
      const channel = supabase
        .channel(`slot-messages:${slotId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'slot_messages',
            filter: `slot_id=eq.${slotId}`,
          },
          () => onChange(),
        )
        .subscribe()
      return () => void supabase.removeChannel(channel)
    },

    async listThreads() {
      const { data, error } = await supabase.rpc('list_threads')
      if (error) fail(error)
      return data as ChatThread[]
    },

    subscribeToChanges(onChange) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const debounced = () => {
        clearTimeout(timer)
        timer = setTimeout(onChange, 400)
      }
      const channel = supabase
        .channel('timeline-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_slots' }, debounced)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'slot_participants' },
          debounced,
        )
        .subscribe()
      return () => {
        clearTimeout(timer)
        void supabase.removeChannel(channel)
      }
    },
  }
}
