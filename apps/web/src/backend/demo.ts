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
} from '@grouppace/shared'
import { MOCK_MESSAGES, MOCK_SLOTS, MOCK_USERS } from '@grouppace/shared/mock'
import { BackendError, type Backend, type Session } from './types'

/*
 * A complete backend that lives in the browser. The sample athletes and workouts are
 * re-dated around "today" on every load; anything the visitor does (accounts, workouts,
 * joins, messages) is saved to storage on this device only.
 */

export const DEMO_STORAGE_KEY = 'grouppace:demo:v1'

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
}

const emptyState = (): DemoState => ({
  accounts: [],
  profiles: {},
  slots: {},
  statusOverrides: {},
  rosters: {},
  messages: [],
  sessionUserId: null,
})

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

  const authListeners = new Set<(session: Session | null) => void>()
  const messageListeners = new Map<string, Set<() => void>>()
  const changeListeners = new Set<() => void>()

  watchStorage?.(() => {
    const before = state.sessionUserId
    state = load()
    if (state.sessionUserId !== before) emitAuth()
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

  function emitAuth() {
    const current = session()
    for (const listener of authListeners) listener(current)
  }

  function requireUserId(): string {
    if (!state.sessionUserId) throw new BackendError('Sign in to do that')
    return state.sessionUserId
  }

  function profileOf(userId: string): Profile {
    const profile = state.profiles[userId] ?? MOCK_USERS.find((u) => u.id === userId)
    if (!profile) throw new BackendError('Athlete not found')
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
    if (!slot) throw new BackendError('That workout no longer exists')
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
        throw new BackendError('Wrong email or password')
      }
      state.sessionUserId = account.userId
      save()
      emitAuth()
    },

    async signUp({ name, email, password }) {
      await pause()
      const normalized = email.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new BackendError('Enter a valid email')
      if (password.length < 8) throw new BackendError('Use at least 8 characters for the password')
      if (name.trim().length < 2) throw new BackendError('Enter your name')
      if (state.accounts.some((a) => a.email === normalized)) {
        throw new BackendError('There is already an account with that email')
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
      }
      state.sessionUserId = userId
      save()
      emitAuth()
      return { needsEmailConfirmation: false }
    },

    async signInAsSample() {
      await pause()
      state.sessionUserId = MOCK_USERS[0]!.id
      save()
      emitAuth()
    },

    async signOut() {
      state.sessionUserId = null
      save()
      emitAuth()
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
      if (name !== undefined && name.length < 2) throw new BackendError('Enter your name')
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
      if (slot.hostId !== userId) throw new BackendError('Only the host can cancel this workout')
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
      if (status === 'CANCELLED') throw new BackendError('This workout was cancelled')
      if (status === 'COMPLETED') throw new BackendError('This workout already happened')
      if (status === 'FULL') throw new BackendError('This workout is full')
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
        throw new BackendError("Hosts can't leave their own workout. Cancel it instead.")
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
      if (!isMember(slot, userId)) throw new BackendError('Join the workout to post in the chat')
      const text = content.trim()
      if (text.length === 0) throw new BackendError('Write something first')
      if (text.length > 2000) throw new BackendError('That message is too long')
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
    const probe = '__grouppace_probe__'
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
