import {
  addDays,
  newSlotInputSchema,
  toISODate,
  type ChatMessage,
  type ChatThread,
  type NewSlotInput,
  type ParticipantStatus,
  type Profile,
  type SlotDetail,
  type SlotStatus,
  type SlotSummary,
  type UserSlot,
} from '@pacemates/shared'
import { MOCK_MESSAGES, MOCK_SLOTS, MOCK_USERS } from '@pacemates/shared/mock'
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
})

/** Mirrors the database's limits on how fast one person can write. */
const RATE_LIMITS = {
  message: { max: 20, windowMs: 60_000 },
  workout: { max: 3, windowMs: 60_000 },
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
  const recentWrites: Record<keyof typeof RATE_LIMITS, number[]> = { message: [], workout: [] }

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
  const today = () => toISODate(now())

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
      participantPreview: going
        .filter((p) => p.userId !== slot.hostId)
        .slice(0, 3)
        .map((p) => summaryOf(p.userId)),
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

    async listSlots({ from, to }) {
      await pause()
      return allSlots()
        .filter((slot) => slot.date >= from && slot.date <= to)
        .map(toSummary)
        .sort(byDateTime)
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
      const detail: SlotDetail = {
        ...toSummary(slot),
        description: slot.description,
        participants: hostFirst.map((p) => {
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
      return allSlots()
        .filter((slot) => isMember(slot, userId))
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
