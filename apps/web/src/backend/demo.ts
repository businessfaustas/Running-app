import {
  addDays,
  distanceKm,
  newSlotInputSchema,
  timeToMinutes,
  toISODate,
  type Area,
  type ChatMessage,
  type ChatThread,
  type LeaderboardEntry,
  type NewSlotInput,
  type ParticipantStatus,
  type Profile,
  type RaceAttendee,
  type RacePost,
  type RacePostTopic,
  type SlotDetail,
  type SlotStatus,
  type SlotSummary,
  type UserSlot,
} from '@pacemates/shared'
import {
  MOCK_MESSAGES,
  MOCK_RACE_ATTENDEES,
  MOCK_RACE_POSTS,
  MOCK_SLOTS,
  MOCK_USERS,
} from '@pacemates/shared/mock'
import { todayISO } from '../lib/clock'
import { isPast } from '../lib/format'
import { emailError, nameError, passwordError } from '../lib/validation'
import { MESSAGES } from './messages'
import { BackendError, type AuthEvent, type Backend, type Session } from './types'

/*
 * A complete backend that lives in the browser. The sample athletes and workouts are
 * re-dated around "today" on every load; anything the visitor does (accounts, workouts,
 * joins, messages) is saved to storage on this device only.
 */

export const DEMO_STORAGE_KEY = 'pacemates:demo:v1'

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StoredSlot extends NewSlotInput {
  id: string
  hostId: string
  status: SlotStatus
}

interface StoredParticipant {
  userId: string
  status: ParticipantStatus
  joinedAt: string
}

interface StoredMessage {
  id: string
  slotId: string
  senderId: string
  content: string
  createdAt: string
}

interface StoredRaceAttendee {
  userId: string
  distanceKm: number | null
  joinedAt: string
}

interface StoredRacePost {
  id: string
  raceSlug: string
  parentId: string | null
  authorId: string
  topic: RacePostTopic
  content: string
  createdAt: string
}

interface DemoState {
  accounts: { userId: string; email: string; passwordHash: string }[]
  /** New users, plus edits to the sample athletes. */
  profiles: Record<string, Profile>
  /** Workouts created on this device. */
  slots: Record<string, StoredSlot>
  /** E.g. a host cancelling one of the sample workouts. */
  statusOverrides: Record<string, SlotStatus>
  /** Replaces a workout's sample roster once anyone joins or leaves. */
  rosters: Record<string, StoredParticipant[]>
  messages: StoredMessage[]
  sessionUserId: string | null
  /** Set by "forgot password": stands in for the emailed recovery link. */
  recoveryUserId: string | null
  /** Replaces a race's sample attendee list once anyone changes it. */
  raceAttendees: Record<string, StoredRaceAttendee[]>
  racePosts: StoredRacePost[]
  /** Sample posts their (sample) authors deleted. */
  deletedRacePostIds: string[]
}

const emptyState = (): DemoState => ({
  accounts: [],
  profiles: {},
  slots: {},
  statusOverrides: {},
  rosters: {},
  messages: [],
  sessionUserId: null,
  recoveryUserId: null,
  raceAttendees: {},
  racePosts: [],
  deletedRacePostIds: [],
})

/** Mirrors the database's limits on how fast one person can write. */
const RATE_LIMITS = {
  message: { max: 20, windowMs: 60_000 },
  workout: { max: 3, windowMs: 60_000 },
  racePost: { max: 6, windowMs: 60_000 },
} as const

async function hashPassword(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${email}\u0000${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface DemoOptions {
  storage: KeyValueStorage
  now?: () => Date
  latencyMs?: number
  /** Subscribe to writes made by other tabs; returns an unsubscribe function. */
  watchStorage?: (onChange: () => void) => () => void
}

export function createDemoBackend({
  storage,
  now = () => new Date(),
  latencyMs = 120,
  watchStorage,
}: DemoOptions): Backend {
  const loadedAt = now()
  let state = load()

  const authListeners = new Set<(session: Session | null, event: AuthEvent) => void>()
  const recentWrites: Record<keyof typeof RATE_LIMITS, number[]> = {
    message: [],
    workout: [],
    racePost: [],
  }
  const raceListeners = new Map<string, Set<() => void>>()

  function hitRateLimit(action: keyof typeof RATE_LIMITS) {
    const { max, windowMs } = RATE_LIMITS[action]
    const at = now().getTime()
    const recent = recentWrites[action].filter((t) => at - t < windowMs)
    if (recent.length >= max) throw new BackendError(MESSAGES.rateLimited)
    recentWrites[action] = [...recent, at]
  }
  const messageListeners = new Map<string, Set<() => void>>()
  const changeListeners = new Set<() => void>()

  watchStorage?.(() => {
    const before = state.sessionUserId
    state = load()
    if (state.sessionUserId !== before) emitAuth(state.sessionUserId ? 'SIGNED_IN' : 'SIGNED_OUT')
    for (const listener of changeListeners) listener()
    for (const listeners of messageListeners.values()) for (const l of listeners) l()
    for (const listeners of raceListeners.values()) for (const l of listeners) l()
  })

  function load(): DemoState {
    try {
      const raw = storage.getItem(DEMO_STORAGE_KEY)
      return raw ? { ...emptyState(), ...(JSON.parse(raw) as Partial<DemoState>) } : emptyState()
    } catch {
      return emptyState()
    }
  }

  function save() {
    try {
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked (private mode): keep working in memory.
    }
  }

  const pause = () => new Promise((resolve) => setTimeout(resolve, latencyMs))
  const today = () => todayISO(now())

  function session(): Session | null {
    if (!state.sessionUserId) return null
    const account = state.accounts.find((a) => a.userId === state.sessionUserId)
    return { userId: state.sessionUserId, email: account?.email ?? null }
  }

  function emitAuth(event: AuthEvent) {
    const current = session()
    for (const listener of authListeners) listener(current, event)
  }

  function requireUserId(): string {
    if (!state.sessionUserId) throw new BackendError(MESSAGES.signInFirst)
    return state.sessionUserId
  }

  function profileOf(userId: string): Profile {
    const profile = state.profiles[userId] ?? MOCK_USERS.find((u) => u.id === userId)
    if (!profile) throw new BackendError(MESSAGES.athleteNotFound)
    return profile
  }

  const summaryOf = (userId: string) => {
    const { id, name, avatarUrl } = profileOf(userId)
    return { id, name, avatarUrl }
  }

  function allSlots(): StoredSlot[] {
    const sample = MOCK_SLOTS.map(({ dayOffset, participantIds: _, ...slot }): StoredSlot => ({
      ...slot,
      date: addDays(today(), dayOffset),
    }))
    return [...sample, ...Object.values(state.slots)]
  }

  function findSlot(slotId: string): StoredSlot {
    const slot = allSlots().find((s) => s.id === slotId)
    if (!slot) throw new BackendError(MESSAGES.workoutGone)
    return slot
  }

  function rosterOf(slot: StoredSlot): StoredParticipant[] {
    const stored = state.rosters[slot.id]
    if (stored) return stored
    const sample = MOCK_SLOTS.find((s) => s.id === slot.id)
    const others = sample?.participantIds ?? []
    const at = (hoursAgo: number) =>
      new Date(loadedAt.getTime() - hoursAgo * 3_600_000).toISOString()
    return [
      { userId: slot.hostId, status: 'ACCEPTED', joinedAt: at(others.length + 24) },
      ...others.map((userId, i) => ({
        userId,
        status: 'ACCEPTED' as const,
        joinedAt: at(others.length - i),
      })),
    ]
  }

  const accepted = (roster: StoredParticipant[]) => roster.filter((p) => p.status === 'ACCEPTED')

  const inArea = (slot: StoredSlot, area: Area | null | undefined) =>
    !area || distanceKm(area, slot.meetingPoint) <= area.radiusKm

  /** Mirrors the database triggers: OPEN/FULL follows the head-count. */
  function statusOf(slot: StoredSlot, roster: StoredParticipant[]): SlotStatus {
    const base = state.statusOverrides[slot.id] ?? slot.status
    if (base === 'CANCELLED' || base === 'COMPLETED') return base
    const full = slot.maxParticipants !== null && accepted(roster).length >= slot.maxParticipants
    return full ? 'FULL' : 'OPEN'
  }

  function toSummary(slot: StoredSlot): SlotSummary {
    const roster = rosterOf(slot)
    const going = accepted(roster)
    return {
      id: slot.id,
      title: slot.title,
      sportType: slot.sportType,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      distanceKm: slot.distanceKm,
      targetPace: slot.targetPace,
      vibeTag: slot.vibeTag,
      meetingPoint: slot.meetingPoint,
      maxParticipants: slot.maxParticipants,
      status: statusOf(slot, roster),
      host: summaryOf(slot.hostId),
      participantCount: going.length,
      participantPreview:
        state.sessionUserId && isMember(slot, state.sessionUserId)
          ? going
              .filter((p) => p.userId !== slot.hostId)
              .slice(0, 3)
              .map((p) => summaryOf(p.userId))
          : [],
    }
  }

  const byDateTime = (a: SlotSummary, b: SlotSummary) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)

  function messagesOf(slotId: string): ChatMessage[] {
    const sample = MOCK_MESSAGES.filter((m) => m.slotId === slotId).map((m, i) => ({
      id: `sample-${slotId}-${i}`,
      slotId,
      senderId: m.senderId,
      content: m.content,
      createdAt: new Date(loadedAt.getTime() - m.minutesAgo * 60_000).toISOString(),
    }))
    return [...sample, ...state.messages.filter((m) => m.slotId === slotId)]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(({ senderId, ...m }) => ({ ...m, sender: summaryOf(senderId) }))
  }

  function isMember(slot: StoredSlot, userId: string) {
    return accepted(rosterOf(slot)).some((p) => p.userId === userId)
  }

  function notifyMessages(slotId: string) {
    for (const listener of messageListeners.get(slotId) ?? []) listener()
  }

  function attendeesOf(raceSlug: string): StoredRaceAttendee[] {
    const stored = state.raceAttendees[raceSlug]
    if (stored) return stored
    return MOCK_RACE_ATTENDEES.filter((a) => a.raceSlug === raceSlug).map((a) => ({
      userId: a.userId,
      distanceKm: a.distanceKm,
      joinedAt: new Date(loadedAt.getTime() - a.daysAgo * 86_400_000).toISOString(),
    }))
  }

  function allRaceSlugsWithAttendance(): string[] {
    const slugs = new Set([
      ...MOCK_RACE_ATTENDEES.map((a) => a.raceSlug),
      ...Object.keys(state.raceAttendees),
    ])
    return [...slugs]
  }

  function racePostsOf(raceSlug: string): StoredRacePost[] {
    const deleted = new Set(state.deletedRacePostIds)
    const sample = MOCK_RACE_POSTS.filter((p) => p.raceSlug === raceSlug && !deleted.has(p.id)).map(
      (p): StoredRacePost => ({
        id: p.id,
        raceSlug: p.raceSlug,
        parentId: p.parentId,
        authorId: p.authorId,
        topic: p.topic,
        content: p.content,
        createdAt: new Date(loadedAt.getTime() - p.minutesAgo * 60_000).toISOString(),
      }),
    )
    // A deleted post takes its replies with it, as in the database.
    const all = [...sample, ...state.racePosts.filter((p) => p.raceSlug === raceSlug)]
    const ids = new Set(all.map((p) => p.id))
    return all
      .filter((p) => p.parentId === null || ids.has(p.parentId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  const toRacePost = ({ authorId, ...post }: StoredRacePost): RacePost => ({
    ...post,
    author: summaryOf(authorId),
  })

  function notifyRace(raceSlug: string) {
    for (const listener of raceListeners.get(raceSlug) ?? []) listener()
  }

  return {
    mode: 'demo',

    async getSession() {
      return session()
    },

    onAuthChange(listener) {
      authListeners.add(listener)
      return () => authListeners.delete(listener)
    },

    async signIn({ email, password }) {
      await pause()
      const normalized = email.trim().toLowerCase()
      const account = state.accounts.find((a) => a.email === normalized)
      if (!account || account.passwordHash !== (await hashPassword(normalized, password))) {
        throw new BackendError(MESSAGES.wrongCredentials)
      }
      state.sessionUserId = account.userId
      save()
      emitAuth('SIGNED_IN')
    },

    async signUp({ name, email, password }) {
      await pause()
      const normalized = email.trim().toLowerCase()
      const problem = emailError(normalized) ?? passwordError(password) ?? nameError(name)
      if (problem) throw new BackendError(problem)
      if (state.accounts.some((a) => a.email === normalized)) {
        throw new BackendError(MESSAGES.emailTaken)
      }
      const userId = crypto.randomUUID()
      state.accounts.push({
        userId,
        email: normalized,
        passwordHash: await hashPassword(normalized, password),
      })
      state.profiles[userId] = {
        id: userId,
        name: name.trim(),
        avatarUrl: null,
        bio: null,
        sports: [],
        defaultPaces: {},
        stravaId: null,
        city: null,
        onboarded: false,
      }
      state.sessionUserId = userId
      save()
      emitAuth('SIGNED_IN')
      // Preview accounts are confirmed straight away; there's no email to click.
      return { needsEmailConfirmation: false }
    },

    async resendConfirmation(email) {
      await pause()
      const problem = emailError(email)
      if (problem) throw new BackendError(problem)
    },

    async requestPasswordReset(email) {
      await pause()
      const normalized = email.trim().toLowerCase()
      const problem = emailError(normalized)
      if (problem) throw new BackendError(problem)
      // No email in preview mode: remember who asked, as if they'd opened the link.
      const account = state.accounts.find((a) => a.email === normalized)
      state.recoveryUserId = account?.userId ?? null
      save()
    },

    async updatePassword(password) {
      await pause()
      const problem = passwordError(password)
      if (problem) throw new BackendError(problem)
      const userId = state.sessionUserId ?? state.recoveryUserId
      if (!userId) throw new BackendError(MESSAGES.linkExpired)
      const account = state.accounts.find((a) => a.userId === userId)
      if (!account) throw new BackendError(MESSAGES.sampleHasNoPassword)
      const hash = await hashPassword(account.email, password)
      if (hash === account.passwordHash) throw new BackendError(MESSAGES.samePassword)
      account.passwordHash = hash
      state.recoveryUserId = null
      state.sessionUserId = userId
      save()
      emitAuth('USER_UPDATED')
    },

    async deleteAccount() {
      await pause()
      const userId = requireUserId()
      if (!state.accounts.some((a) => a.userId === userId)) {
        // A sample athlete: there's nothing of theirs to delete but this device's changes.
        state = emptyState()
      } else {
        const hosted = new Set(
          Object.values(state.slots)
            .filter((slot) => slot.hostId === userId)
            .map((slot) => slot.id),
        )
        state.accounts = state.accounts.filter((a) => a.userId !== userId)
        delete state.profiles[userId]
        for (const id of hosted) {
          delete state.slots[id]
          delete state.rosters[id]
          delete state.statusOverrides[id]
        }
        for (const [id, roster] of Object.entries(state.rosters)) {
          state.rosters[id] = roster.filter((p) => p.userId !== userId)
        }
        state.messages = state.messages.filter(
          (m) => m.senderId !== userId && !hosted.has(m.slotId),
        )
        for (const slug of allRaceSlugsWithAttendance()) {
          state.raceAttendees[slug] = attendeesOf(slug).filter((a) => a.userId !== userId)
        }
        state.racePosts = state.racePosts.filter((p) => p.authorId !== userId)
        state.sessionUserId = null
        state.recoveryUserId = null
      }
      save()
      emitAuth('SIGNED_OUT')
      for (const listener of changeListeners) listener()
    },

    async signInAsSample() {
      await pause()
      state.sessionUserId = MOCK_USERS[0]!.id
      save()
      emitAuth('SIGNED_IN')
    },

    async resetDemo() {
      await pause()
      state = emptyState()
      save()
      emitAuth('SIGNED_OUT')
      for (const listener of changeListeners) listener()
    },

    async signOut() {
      state.sessionUserId = null
      save()
      emitAuth('SIGNED_OUT')
    },

    async getProfile(userId) {
      await pause()
      try {
        return profileOf(userId)
      } catch {
        return null
      }
    },

    async updateProfile(patch) {
      await pause()
      const userId = requireUserId()
      const name = patch.name?.trim()
      if (name !== undefined && name.length < 2) throw new BackendError(MESSAGES.nameRequired)
      const updated = { ...profileOf(userId), ...patch, ...(name ? { name } : {}) }
      state.profiles[userId] = updated
      save()
      return updated
    },

    async setAvatar(image) {
      await pause()
      const userId = requireUserId()
      // On this device the photo lives inside the saved state, as a data URL.
      const avatarUrl = image ? await blobToDataUrl(image) : null
      const updated = { ...profileOf(userId), avatarUrl }
      state.profiles[userId] = updated
      save()
      return updated
    },

    async listSlots({ from, to }, area) {
      await pause()
      return allSlots()
        .filter((slot) => slot.date >= from && slot.date <= to && inArea(slot, area))
        .map(toSummary)
        .sort(byDateTime)
    },

    async getLeaderboard({ from, to }, area) {
      await pause()
      const at = now()
      const todayKey = toISODate(at)
      const nowMinutes = at.getHours() * 60 + at.getMinutes()
      const totals = new Map<string, LeaderboardEntry>()
      for (const slot of allSlots()) {
        if (slot.date < from || slot.date > to || !inArea(slot, area)) continue
        const roster = rosterOf(slot)
        if (statusOf(slot, roster) === 'CANCELLED') continue
        const start = timeToMinutes(slot.startTime)
        const end = slot.endTime ? timeToMinutes(slot.endTime) : start + 60
        const finished = slot.date < todayKey || (slot.date === todayKey && end <= nowMinutes)
        if (!finished) continue
        const running = slot.sportType === 'RUN' || slot.sportType === 'TRACK'
        for (const { userId } of accepted(roster)) {
          const entry = totals.get(userId) ?? {
            user: summaryOf(userId),
            runKm: 0,
            rideKm: 0,
            workouts: 0,
            hosted: 0,
          }
          if (running) entry.runKm += slot.distanceKm
          else entry.rideKm += slot.distanceKm
          entry.workouts += 1
          if (userId === slot.hostId) entry.hosted += 1
          totals.set(userId, entry)
        }
      }
      return [...totals.values()]
        .map((e) => ({ ...e, runKm: round1(e.runKm), rideKm: round1(e.rideKm) }))
        .sort((a, b) => b.workouts - a.workouts || b.runKm + b.rideKm - (a.runKm + a.rideKm))
    },

    async getSlot(slotId) {
      await pause()
      const slot = allSlots().find((s) => s.id === slotId)
      if (!slot) return null
      const roster = rosterOf(slot)
      const hostFirst = [...roster].sort(
        (a, b) =>
          Number(b.userId === slot.hostId) - Number(a.userId === slot.hostId) ||
          a.joinedAt.localeCompare(b.joinedAt),
      )
      // Who's going is visible to the people in the workout only.
      const me = state.sessionUserId
      const visible =
        me && isMember(slot, me) ? hostFirst : hostFirst.filter((p) => p.userId === me)
      const detail: SlotDetail = {
        ...toSummary(slot),
        description: slot.description,
        participants: visible.map((p) => {
          const profile = profileOf(p.userId)
          return {
            id: profile.id,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            defaultPaces: profile.defaultPaces,
            status: p.status,
            joinedAt: p.joinedAt,
            isHost: p.userId === slot.hostId,
          }
        }),
      }
      return detail
    },

    async listUserSlots(userId) {
      await pause()
      // Others see what this person hosts and what has already happened – not where
      // they've signed up to be next.
      const self = userId === state.sessionUserId
      return allSlots()
        .filter((slot) => isMember(slot, userId))
        .filter(
          (slot) =>
            self ||
            slot.hostId === userId ||
            isPast(slot.date, slot.startTime, slot.endTime, now()),
        )
        .map((slot): UserSlot => ({
          slot: toSummary(slot),
          role: slot.hostId === userId ? 'HOST' : 'PARTICIPANT',
        }))
        .sort((a, b) => byDateTime(a.slot, b.slot))
    },

    async createSlot(input) {
      await pause()
      const userId = requireUserId()
      const parsed = newSlotInputSchema.safeParse(input)
      if (!parsed.success) throw new BackendError(parsed.error.issues[0]!.message)
      hitRateLimit('workout')
      const id = crypto.randomUUID()
      const slot: StoredSlot = { ...parsed.data, id, hostId: userId, status: 'OPEN' }
      state.slots[id] = slot
      state.rosters[id] = [{ userId, status: 'ACCEPTED', joinedAt: now().toISOString() }]
      save()
      return toSummary(slot)
    },

    async cancelSlot(slotId) {
      await pause()
      const userId = requireUserId()
      const slot = findSlot(slotId)
      if (slot.hostId !== userId) throw new BackendError(MESSAGES.hostOnlyCancel)
      state.statusOverrides[slotId] = 'CANCELLED'
      save()
    },

    async joinSlot(slotId) {
      await pause()
      const userId = requireUserId()
      const slot = findSlot(slotId)
      const roster = rosterOf(slot)
      if (roster.some((p) => p.userId === userId)) return
      const status = statusOf(slot, roster)
      if (status === 'CANCELLED') throw new BackendError(MESSAGES.cancelled)
      if (status === 'COMPLETED') throw new BackendError(MESSAGES.completed)
      if (status === 'FULL') throw new BackendError(MESSAGES.full)
      state.rosters[slotId] = [
        ...roster,
        { userId, status: 'ACCEPTED', joinedAt: now().toISOString() },
      ]
      save()
    },

    async leaveSlot(slotId) {
      await pause()
      const userId = requireUserId()
      const slot = findSlot(slotId)
      if (slot.hostId === userId) {
        throw new BackendError(MESSAGES.hostCantLeave)
      }
      state.rosters[slotId] = rosterOf(slot).filter((p) => p.userId !== userId)
      save()
    },

    async listMessages(slotId) {
      await pause()
      const userId = state.sessionUserId
      const slot = allSlots().find((s) => s.id === slotId)
      // Like the database's row-level security: only participants can read the chat.
      if (!slot || !userId || !isMember(slot, userId)) return []
      return messagesOf(slotId)
    },

    async sendMessage(slotId, content) {
      await pause()
      const userId = requireUserId()
      const slot = findSlot(slotId)
      if (!isMember(slot, userId)) throw new BackendError(MESSAGES.joinToChat)
      const text = content.trim()
      if (text.length === 0) throw new BackendError(MESSAGES.emptyMessage)
      if (text.length > 2000) throw new BackendError(MESSAGES.longMessage)
      hitRateLimit('message')
      const stored: StoredMessage = {
        id: crypto.randomUUID(),
        slotId,
        senderId: userId,
        content: text,
        createdAt: now().toISOString(),
      }
      state.messages.push(stored)
      save()
      notifyMessages(slotId)
      return { ...stored, sender: summaryOf(userId) }
    },

    subscribeToMessages(slotId, onChange) {
      const listeners = messageListeners.get(slotId) ?? new Set()
      listeners.add(onChange)
      messageListeners.set(slotId, listeners)
      return () => listeners.delete(onChange)
    },

    async listThreads() {
      await pause()
      const userId = state.sessionUserId
      if (!userId) return []
      const since = addDays(today(), -7)
      const threads: ChatThread[] = allSlots()
        .filter((slot) => slot.date >= since && isMember(slot, userId))
        .map((slot) => ({ slot: toSummary(slot), lastMessage: messagesOf(slot.id).at(-1) ?? null }))
      const activity = (t: ChatThread) => t.lastMessage?.createdAt ?? ''
      return threads.sort(
        (a, b) => activity(b).localeCompare(activity(a)) || byDateTime(a.slot, b.slot),
      )
    },

    subscribeToChanges(onChange) {
      changeListeners.add(onChange)
      return () => changeListeners.delete(onChange)
    },

    async listRaceAttendance() {
      await pause()
      const counts: Record<string, number> = {}
      for (const slug of allRaceSlugsWithAttendance()) {
        const count = attendeesOf(slug).length
        if (count > 0) counts[slug] = count
      }
      return counts
    },

    async listRaceAttendees(raceSlug) {
      await pause()
      // Names for signed-in runners; visitors see head-counts only.
      if (!state.sessionUserId) return []
      return attendeesOf(raceSlug).map((a): RaceAttendee => ({
        ...summaryOf(a.userId),
        distanceKm: a.distanceKm,
        joinedAt: a.joinedAt,
      }))
    },

    async listUserRaces(userId) {
      await pause()
      if (!state.sessionUserId) return []
      return allRaceSlugsWithAttendance().flatMap((raceSlug) => {
        const mine = attendeesOf(raceSlug).find((a) => a.userId === userId)
        return mine ? [{ raceSlug, distanceKm: mine.distanceKm }] : []
      })
    },

    async setRaceAttendance(raceSlug, attendance) {
      await pause()
      const userId = requireUserId()
      const others = attendeesOf(raceSlug).filter((a) => a.userId !== userId)
      state.raceAttendees[raceSlug] = attendance
        ? [...others, { userId, distanceKm: attendance.distanceKm, joinedAt: now().toISOString() }]
        : others
      save()
      notifyRace(raceSlug)
    },

    async listRacePosts(raceSlug) {
      await pause()
      return racePostsOf(raceSlug).map(toRacePost)
    },

    async createRacePost(raceSlug, post) {
      await pause()
      const userId = requireUserId()
      const content = post.content.trim()
      if (content.length === 0) throw new BackendError(MESSAGES.emptyMessage)
      if (content.length > 2000) throw new BackendError(MESSAGES.longMessage)
      if (post.parentId) {
        const parent = racePostsOf(raceSlug).find((p) => p.id === post.parentId)
        if (!parent || parent.parentId !== null) throw new BackendError(MESSAGES.notAllowed)
      }
      hitRateLimit('racePost')
      const stored: StoredRacePost = {
        id: crypto.randomUUID(),
        raceSlug,
        parentId: post.parentId,
        authorId: userId,
        topic: post.topic,
        content,
        createdAt: now().toISOString(),
      }
      state.racePosts.push(stored)
      save()
      notifyRace(raceSlug)
      return toRacePost(stored)
    },

    async deleteRacePost(postId) {
      await pause()
      const userId = requireUserId()
      const own = state.racePosts.find((p) => p.id === postId)
      const sample = MOCK_RACE_POSTS.find((p) => p.id === postId)
      if (own?.authorId === userId) {
        state.racePosts = state.racePosts.filter((p) => p.id !== postId && p.parentId !== postId)
        save()
        notifyRace(own.raceSlug)
      } else if (sample?.authorId === userId) {
        state.deletedRacePostIds.push(postId)
        save()
        notifyRace(sample.raceSlug)
      } else {
        throw new BackendError(MESSAGES.notAllowed)
      }
    },

    subscribeToRace(raceSlug, onChange) {
      const listeners = raceListeners.get(raceSlug) ?? new Set()
      listeners.add(onChange)
      raceListeners.set(raceSlug, listeners)
      return () => listeners.delete(onChange)
    },
  }
}

/** localStorage when it's usable, otherwise an in-memory stand-in. */
export function browserStorage(): KeyValueStorage {
  try {
    const probe = '__pacemates_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    const memory = new Map<string, string>()
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
    }
  }
}

export function watchBrowserStorage(onChange: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === DEMO_STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

const round1 = (n: number) => Math.round(n * 10) / 10

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`
}
