import { distanceKm } from '@pacemates/shared'
import type {
  ChatMessage,
  ChatThread,
  LeaderboardEntry,
  Profile,
  ProfileUpdate,
  RaceAttendee,
  RacePost,
  SlotDetail,
  SlotSummary,
  UserSlot,
} from '@pacemates/shared'
import {
  createClient,
  type AuthChangeEvent,
  type PostgrestError,
  type Session as AuthSession,
} from '@supabase/supabase-js'
import { reportError } from '../lib/monitoring'
import { MESSAGES, waitSeconds } from './messages'
import { BackendError, type AuthEvent, type Backend, type Session } from './types'

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
  city: string | null
  onboarded_at: string | null
}

const PROFILE_COLUMNS =
  'id, name, avatar_url, bio, sports, default_paces, strava_id, city, onboarded_at'
/*
 * Until the database has the newer migrations (profiles.city, list_slots_near), fall back to
 * what an older schema has, so deploying the app before migrating doesn't break it.
 */
const LEGACY_PROFILE_COLUMNS =
  'id, name, avatar_url, bio, sports, default_paces, strava_id, onboarded_at'
const isMissingColumn = (error: PostgrestError) => error.code === '42703'
const isMissingFunction = (error: PostgrestError) => error.code === 'PGRST202'

interface MessageRow {
  id: string
  slot_id: string
  content: string
  created_at: string
  sender: { id: string; name: string; avatar_url: string | null } | null
}

const MESSAGE_COLUMNS = 'id, slot_id, content, created_at, sender:profiles(id, name, avatar_url)'

interface PersonRow {
  id: string
  name: string
  avatar_url: string | null
}

interface RacePostRow {
  id: string
  race_slug: string
  parent_id: string | null
  topic: RacePost['topic']
  content: string
  created_at: string
  author: PersonRow | null
}

const RACE_POST_COLUMNS =
  'id, race_slug, parent_id, topic, content, created_at, author:profiles(id, name, avatar_url)'

const person = (row: PersonRow | null) =>
  row
    ? { id: row.id, name: row.name, avatarUrl: row.avatar_url }
    : { id: 'unknown', name: 'Kažkas', avatarUrl: null }

const toRacePost = (row: RacePostRow): RacePost => ({
  id: row.id,
  raceSlug: row.race_slug,
  parentId: row.parent_id,
  topic: row.topic,
  content: row.content,
  createdAt: row.created_at,
  author: person(row.author),
})

/** Supabase Auth error codes, reworded for people. */
const AUTH_ERROR_CODES: Record<string, string> = {
  invalid_credentials: MESSAGES.wrongCredentials,
  email_not_confirmed: MESSAGES.emailNotConfirmed,
  user_already_exists: MESSAGES.emailTaken,
  email_exists: MESSAGES.emailTaken,
  weak_password: MESSAGES.weakPassword,
  same_password: MESSAGES.samePassword,
  email_address_invalid: MESSAGES.invalidEmail,
  validation_failed: MESSAGES.invalidEmail,
  over_email_send_rate_limit: MESSAGES.emailRateLimited,
  over_request_rate_limit: MESSAGES.rateLimited,
  otp_expired: MESSAGES.linkExpired,
  flow_state_expired: MESSAGES.linkExpired,
  session_not_found: MESSAGES.sessionExpired,
  session_expired: MESSAGES.sessionExpired,
  refresh_token_not_found: MESSAGES.sessionExpired,
  reauthentication_needed: MESSAGES.reauthNeeded,
  signup_disabled: MESSAGES.signupsDisabled,
  email_provider_disabled: MESSAGES.signupsDisabled,
}

/** Database and auth errors that are worth showing, matched on their text. */
const FRIENDLY_ERRORS: [RegExp, string][] = [
  [/workout is full/i, MESSAGES.full],
  [/workout is cancelled/i, MESSAGES.cancelled],
  [/workout is completed/i, MESSAGES.completed],
  [/reply must belong|replies can only/i, MESSAGES.notAllowed],
  [/rate limit/i, MESSAGES.rateLimited],
  [/too many requests/i, MESSAGES.rateLimited],
  [/invalid login credentials/i, MESSAGES.wrongCredentials],
  [/email not confirmed/i, MESSAGES.emailNotConfirmed],
  [/user already registered/i, MESSAGES.emailTaken],
  [/password should (be at least|contain)/i, MESSAGES.weakPassword],
  [/different from the old password/i, MESSAGES.samePassword],
  [/invalid format|unable to validate email/i, MESSAGES.invalidEmail],
  [/jwt expired|auth session missing|refresh token/i, MESSAGES.sessionExpired],
  [/link is invalid or has expired|token has expired|otp/i, MESSAGES.linkExpired],
  [/violates check constraint/i, MESSAGES.invalidInput],
  [/row-level security|permission denied/i, MESSAGES.notAllowed],
  [/sign in to/i, MESSAGES.signInFirst],
  [/failed to fetch|network ?error|load failed/i, MESSAGES.offline],
]

function fail(error: PostgrestError | { message: string; code?: string }): never {
  const seconds = /only request this after (\d+) seconds/i.exec(error.message)?.[1]
  if (seconds) throw new BackendError(waitSeconds(Number(seconds)))
  const byCode = error.code ? AUTH_ERROR_CODES[error.code] : undefined
  const friendly = byCode ?? FRIENDLY_ERRORS.find(([pattern]) => pattern.test(error.message))?.[1]
  if (friendly) throw new BackendError(friendly)
  // Something we didn't plan for: tell the person plainly and record the details.
  reportError(new Error(`Supabase: ${error.message}`), { code: error.code })
  throw new BackendError(MESSAGES.unknown)
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  avatarUrl: row.avatar_url,
  bio: row.bio,
  sports: row.sports,
  defaultPaces: row.default_paces,
  stravaId: row.strava_id,
  city: row.city ?? null,
  onboarded: row.onboarded_at !== null,
})

const AVATARS = 'avatars'
/** One photo per person, replaced in place; the URL carries a version to skip stale caches. */
const avatarPath = (userId: string) => `${userId}/avatar`

const toMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  slotId: row.slot_id,
  content: row.content,
  createdAt: row.created_at,
  sender: row.sender
    ? { id: row.sender.id, name: row.sender.name, avatarUrl: row.sender.avatar_url }
    : { id: 'unknown', name: 'Kažkas', avatarUrl: null },
})

const toSession = (session: AuthSession | null): Session | null =>
  session ? { userId: session.user.id, email: session.user.email ?? null } : null

const toAuthEvent = (event: AuthChangeEvent): AuthEvent =>
  event === 'SIGNED_IN' ||
  event === 'SIGNED_OUT' ||
  event === 'PASSWORD_RECOVERY' ||
  event === 'USER_UPDATED'
    ? event
    : 'OTHER'

/** Where links in auth emails land: /auth/callback reads the result and moves on. */
const callbackUrl = () => `${window.location.origin}/auth/callback`

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Email links carry the session in the URL #fragment. The implicit flow lets a link
      // work even when it's opened in a different browser than the one that asked for it.
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  })

  async function requireUserId(): Promise<string> {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw new BackendError(MESSAGES.signInFirst)
    return data.session.user.id
  }

  async function updateProfile(patch: ProfileUpdate): Promise<Profile> {
    const userId = await requireUserId()
    const row: Partial<ProfileRow> = {}
    if (patch.name !== undefined) row.name = patch.name.trim()
    if (patch.bio !== undefined) row.bio = patch.bio
    if (patch.sports !== undefined) row.sports = patch.sports
    if (patch.defaultPaces !== undefined) row.default_paces = patch.defaultPaces
    if (patch.stravaId !== undefined) row.strava_id = patch.stravaId
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl
    if (patch.city !== undefined) row.city = patch.city
    if (patch.onboarded) row.onboarded_at = new Date().toISOString()
    if (row.name !== undefined && row.name.length < 2) throw new BackendError(MESSAGES.nameRequired)
    const save = (values: Partial<ProfileRow>, columns: string) =>
      supabase.from('profiles').update(values).eq('id', userId).select(columns).single<ProfileRow>()
    let { data, error } = await save(row, PROFILE_COLUMNS)
    if (error && isMissingColumn(error)) {
      const { city: _, ...rest } = row
      ;({ data, error } = await save(rest, LEGACY_PROFILE_COLUMNS))
    }
    if (error) fail(error)
    return toProfile(data!)
  }

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await supabase.auth.getSession()
      return toSession(data.session)
    },

    onAuthChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((event, session) =>
        listener(toSession(session), toAuthEvent(event)),
      )
      return () => data.subscription.unsubscribe()
    },

    async signIn({ email, password }) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) fail(error)
    },

    async signUp({ name, email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl(),
          // Read by the handle_new_user() trigger to name the profile.
          data: { name: name.trim(), terms_accepted_at: new Date().toISOString() },
        },
      })
      if (error) fail(error)
      // With email confirmation on, an address that's already registered gets the same
      // answer as a new one (no session), so the form can't reveal who has an account.
      return { needsEmailConfirmation: !data.session }
    },

    async resendConfirmation(email) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl() },
      })
      if (error) fail(error)
    },

    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callbackUrl(),
      })
      if (error) fail(error)
    },

    async updatePassword(password) {
      const { data } = await supabase.auth.getSession()
      if (!data.session) throw new BackendError(MESSAGES.linkExpired)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) fail(error)
    },

    async deleteAccount() {
      const userId = await requireUserId()
      // Storage files aren't rows that cascade, so remove the photo first (best effort).
      await supabase.storage.from(AVATARS).remove([avatarPath(userId)])
      const { error } = await supabase.rpc('delete_account')
      if (error) fail(error)
      // The login no longer exists; drop the local session without calling the server.
      await supabase.auth.signOut({ scope: 'local' })
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      // Already signed out on the server (e.g. expired): still clear this device.
      if (error) await supabase.auth.signOut({ scope: 'local' })
    },

    async getProfile(userId) {
      const load = (columns: string) =>
        supabase.from('profiles').select(columns).eq('id', userId).maybeSingle<ProfileRow>()
      let { data, error } = await load(PROFILE_COLUMNS)
      if (error && isMissingColumn(error)) ({ data, error } = await load(LEGACY_PROFILE_COLUMNS))
      if (error) fail(error)
      return data ? toProfile(data) : null
    },

    updateProfile,

    async setAvatar(image) {
      const userId = await requireUserId()
      const bucket = supabase.storage.from(AVATARS)
      if (image === null) {
        // Best effort: once the profile stops pointing at it, the old file is unreachable anyway.
        await bucket.remove([avatarPath(userId)])
        return updateProfile({ avatarUrl: null })
      }
      const { error } = await bucket.upload(avatarPath(userId), image, {
        upsert: true,
        contentType: image.type || 'image/jpeg',
        cacheControl: '3600',
      })
      if (error) {
        reportError(new Error(`Avatar upload: ${error.message}`))
        throw new BackendError(MESSAGES.photoUpload)
      }
      const { publicUrl } = bucket.getPublicUrl(avatarPath(userId)).data
      return updateProfile({ avatarUrl: `${publicUrl}?v=${Date.now()}` })
    },

    async listSlots({ from, to }, area) {
      const { data, error } = area
        ? await supabase.rpc('list_slots_near', {
            p_from: from,
            p_to: to,
            p_lat: area.lat,
            p_lng: area.lng,
            p_radius_m: area.radiusKm * 1000,
          })
        : await supabase.rpc('list_slots', { p_from: from, p_to: to })
      if (error && area && isMissingFunction(error)) {
        const all = await this.listSlots({ from, to })
        return all.filter((slot) => distanceKm(area, slot.meetingPoint) <= area.radiusKm)
      }
      if (error) fail(error)
      return data as SlotSummary[]
    },

    async getLeaderboard({ from, to }, area) {
      const { data, error } = await supabase.rpc('leaderboard', {
        p_from: from,
        p_to: to,
        p_lat: area?.lat ?? null,
        p_lng: area?.lng ?? null,
        p_radius_m: area ? area.radiusKm * 1000 : null,
      })
      if (error) fail(error)
      return data as LeaderboardEntry[]
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
      if (data.length === 0) throw new BackendError(MESSAGES.hostOnlyCancel)
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
        throw new BackendError(MESSAGES.hostCantLeave)
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
      if (text.length === 0) throw new BackendError(MESSAGES.emptyMessage)
      const { data, error } = await supabase
        .from('slot_messages')
        .insert({ slot_id: slotId, sender_id: userId, content: text })
        .select(MESSAGE_COLUMNS)
        .single<MessageRow>()
      if (error) {
        if (/row-level security/i.test(error.message)) {
          throw new BackendError(MESSAGES.joinToChat)
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

    async listRaceAttendance() {
      const { data, error } = await supabase.rpc('race_attendance_counts')
      if (error) fail(error)
      const counts: Record<string, number> = {}
      for (const row of data as { race_slug: string; attendees: number }[]) {
        counts[row.race_slug] = Number(row.attendees)
      }
      return counts
    },

    async listRaceAttendees(raceSlug) {
      const { data, error } = await supabase
        .from('race_attendees')
        .select('distance_km, created_at, profile:profiles(id, name, avatar_url)')
        .eq('race_slug', raceSlug)
        .order('created_at')
        .returns<{ distance_km: number | null; created_at: string; profile: PersonRow | null }[]>()
      if (error) fail(error)
      return data.map((row): RaceAttendee => ({
        ...person(row.profile),
        distanceKm: row.distance_km,
        joinedAt: row.created_at,
      }))
    },

    async listUserRaces(userId) {
      const { data, error } = await supabase
        .from('race_attendees')
        .select('race_slug, distance_km')
        .eq('user_id', userId)
        .returns<{ race_slug: string; distance_km: number | null }[]>()
      if (error) fail(error)
      return data.map((row) => ({ raceSlug: row.race_slug, distanceKm: row.distance_km }))
    },

    async setRaceAttendance(raceSlug, attendance) {
      const userId = await requireUserId()
      if (attendance === null) {
        const { error } = await supabase
          .from('race_attendees')
          .delete()
          .eq('race_slug', raceSlug)
          .eq('user_id', userId)
        if (error) fail(error)
        return
      }
      const { error } = await supabase
        .from('race_attendees')
        .upsert({ race_slug: raceSlug, user_id: userId, distance_km: attendance.distanceKm })
      if (error) fail(error)
    },

    async listRacePosts(raceSlug) {
      const { data, error } = await supabase
        .from('race_posts')
        .select(RACE_POST_COLUMNS)
        .eq('race_slug', raceSlug)
        .order('created_at')
        .returns<RacePostRow[]>()
      if (error) fail(error)
      return data.map(toRacePost)
    },

    async createRacePost(raceSlug, post) {
      const userId = await requireUserId()
      const content = post.content.trim()
      if (content.length === 0) throw new BackendError(MESSAGES.emptyMessage)
      if (content.length > 2000) throw new BackendError(MESSAGES.longMessage)
      const { data, error } = await supabase
        .from('race_posts')
        .insert({
          race_slug: raceSlug,
          author_id: userId,
          parent_id: post.parentId,
          topic: post.topic,
          content,
        })
        .select(RACE_POST_COLUMNS)
        .single<RacePostRow>()
      if (error) fail(error)
      return toRacePost(data)
    },

    async deleteRacePost(postId) {
      await requireUserId()
      const { data, error } = await supabase
        .from('race_posts')
        .delete()
        .eq('id', postId)
        .select('id')
      if (error) fail(error)
      if (data.length === 0) throw new BackendError(MESSAGES.notAllowed)
    },

    subscribeToRace(raceSlug, onChange) {
      const filter = `race_slug=eq.${raceSlug}`
      const channel = supabase
        .channel(`race:${raceSlug}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'race_posts', filter }, () =>
          onChange(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'race_attendees', filter },
          () => onChange(),
        )
        .subscribe()
      return () => void supabase.removeChannel(channel)
    },
  }
}
