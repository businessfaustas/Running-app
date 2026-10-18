import { MOCK_SLOTS, MOCK_USERS } from '@pacemates/shared/mock'
import { describe, expect, it } from 'vitest'
import { createDemoBackend, type KeyValueStorage } from './demo'
import { MESSAGES } from './messages'
import { BackendError } from './types'

const NOW = new Date('2026-10-13T09:00:00')
const TODAY = '2026-10-13'

function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

function setup(storage = memoryStorage()) {
  return createDemoBackend({ storage, now: () => NOW, latencyMs: 0 })
}

const fullRide = MOCK_SLOTS.find((s) => s.id.endsWith('06'))!
const coffeeRun = MOCK_SLOTS.find((s) => s.id.endsWith('04'))!
const cancelledRide = MOCK_SLOTS.find((s) => s.status === 'CANCELLED')!

describe('demo backend', () => {
  it('dates the sample workouts around today and derives FULL from the head-count', async () => {
    const backend = setup()
    const slots = await backend.listSlots({ from: TODAY, to: TODAY })
    expect(slots.length).toBe(MOCK_SLOTS.filter((s) => s.dayOffset === 0).length)
    expect(slots.find((s) => s.id === fullRide.id)).toMatchObject({
      status: 'FULL',
      participantCount: 6,
    })
    expect(slots.map((s) => s.startTime)).toEqual([...slots.map((s) => s.startTime)].sort())
  })

  it('signs up, persists the account and signs back in', async () => {
    const storage = memoryStorage()
    const backend = setup(storage)
    await backend.signUp({ name: 'Ana Runner', email: 'Ana@Example.com', password: 'longenough1' })
    const session = await backend.getSession()
    expect(session?.email).toBe('ana@example.com')
    expect((await backend.getProfile(session!.userId))?.name).toBe('Ana Runner')

    await backend.signOut()
    const reloaded = setup(storage)
    await expect(
      reloaded.signIn({ email: 'ana@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(MESSAGES.wrongCredentials)
    await reloaded.signIn({ email: 'ana@example.com', password: 'longenough1' })
    expect((await reloaded.getSession())?.userId).toBe(session!.userId)
  })

  it('rejects duplicate emails and short passwords', async () => {
    const backend = setup()
    await expect(
      backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'short' }),
    ).rejects.toBeInstanceOf(BackendError)
    await backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'longenough1' })
    await expect(
      backend.signUp({ name: 'Ana 2', email: 'A@B.co', password: 'longenough1' }),
    ).rejects.toThrow(MESSAGES.emailTaken)
  })

  it('joins and leaves, keeping counts and FULL status in sync', async () => {
    const backend = setup()
    await backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'longenough1' })
    const me = (await backend.getSession())!.userId

    await backend.joinSlot(coffeeRun.id)
    let detail = await backend.getSlot(coffeeRun.id)
    expect(detail?.participantCount).toBe(coffeeRun.participantIds.length + 2)
    expect(detail?.participants.at(-1)?.id).toBe(me)
    expect(detail?.participants[0]?.isHost).toBe(true)

    await backend.leaveSlot(coffeeRun.id)
    detail = await backend.getSlot(coffeeRun.id)
    expect(detail?.participants.some((p) => p.id === me)).toBe(false)

    await expect(backend.joinSlot(fullRide.id)).rejects.toThrow(MESSAGES.full)
    await expect(backend.joinSlot(cancelledRide.id)).rejects.toThrow(MESSAGES.cancelled)
  })

  it('reopens a full workout when someone leaves', async () => {
    const backend = setup()
    await backend.signInAsSample!() // Gabija, who is riding the full ride
    await backend.leaveSlot(fullRide.id)
    expect((await backend.getSlot(fullRide.id))?.status).toBe('OPEN')
  })

  it('lets hosts cancel but not leave their own workout', async () => {
    const backend = setup()
    await backend.signInAsSample!() // Gabija hosts the coffee run
    await expect(backend.leaveSlot(coffeeRun.id)).rejects.toThrow(MESSAGES.hostCantLeave)
    await backend.cancelSlot(coffeeRun.id)
    expect((await backend.getSlot(coffeeRun.id))?.status).toBe('CANCELLED')
    await expect(backend.cancelSlot(fullRide.id)).rejects.toThrow(MESSAGES.hostOnlyCancel)
  })

  it('creates workouts with the host already going', async () => {
    const backend = setup()
    await backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'longenough1' })
    const created = await backend.createSlot({
      title: 'Friday shakeout',
      sportType: 'RUN',
      date: '2026-10-16',
      startTime: '07:00',
      endTime: '07:45',
      distanceKm: 6,
      targetPace: '5:45 /km',
      vibeTag: 'SOCIAL_CHAT',
      description: null,
      meetingPoint: { name: 'Vondelpark', lat: 52.358, lng: 4.8686 },
      maxParticipants: 4,
    })
    expect(created).toMatchObject({ participantCount: 1, status: 'OPEN', host: { name: 'Ana' } })
    const friday = await backend.listSlots({ from: '2026-10-16', to: '2026-10-16' })
    expect(friday.some((s) => s.id === created.id)).toBe(true)
    const mine = await backend.listUserSlots((await backend.getSession())!.userId)
    expect(mine).toEqual([expect.objectContaining({ role: 'HOST' })])
  })

  it('validates new workouts', async () => {
    const backend = setup()
    await backend.signInAsSample!()
    await expect(
      backend.createSlot({
        title: 'X',
        sportType: 'RUN',
        date: TODAY,
        startTime: '10:00',
        endTime: '09:00',
        distanceKm: 5,
        targetPace: '6:00 /km',
        vibeTag: 'SOCIAL_CHAT',
        description: null,
        meetingPoint: { name: 'Park', lat: 52, lng: 4 },
        maxParticipants: null,
      }),
    ).rejects.toBeInstanceOf(BackendError)
  })

  it('only shows the chat to participants', async () => {
    const backend = setup()
    await backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'longenough1' })
    expect(await backend.listMessages(coffeeRun.id)).toEqual([])
    await expect(backend.sendMessage(coffeeRun.id, 'hi')).rejects.toThrow(MESSAGES.joinToChat)

    await backend.joinSlot(coffeeRun.id)
    const before = await backend.listMessages(coffeeRun.id)
    expect(before.length).toBeGreaterThan(0)

    let notified = 0
    const stop = backend.subscribeToMessages(coffeeRun.id, () => notified++)
    await backend.sendMessage(coffeeRun.id, '  See you at 10  ')
    stop()
    const after = await backend.listMessages(coffeeRun.id)
    expect(after.at(-1)).toMatchObject({ content: 'See you at 10', sender: { name: 'Ana' } })
    expect(notified).toBe(1)

    const threads = await backend.listThreads()
    expect(threads[0]?.slot.id).toBe(coffeeRun.id)
  })

  it('lets athletes edit their profile', async () => {
    const backend = setup()
    await backend.signInAsSample!()
    const updated = await backend.updateProfile({ bio: 'Sub-3:30 or bust' })
    expect(updated).toMatchObject({ name: MOCK_USERS[0]!.name, bio: 'Sub-3:30 or bust' })
    await expect(backend.updateProfile({ name: ' ' })).rejects.toThrow(MESSAGES.nameRequired)
  })

  it('starts new accounts on onboarding and remembers when it is done', async () => {
    const backend = setup()
    await backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'longenough1' })
    const { userId } = (await backend.getSession())!
    expect((await backend.getProfile(userId))?.onboarded).toBe(false)
    await backend.updateProfile({ sports: ['running'], onboarded: true })
    expect((await backend.getProfile(userId))?.onboarded).toBe(true)
    expect((await backend.getProfile(MOCK_USERS[0]!.id))?.onboarded).toBe(true)
  })

  it('needs letters and a digit in passwords', async () => {
    const backend = setup()
    await expect(
      backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'onlyletters' }),
    ).rejects.toThrow(/skaičius/)
  })

  it('resets a forgotten password through the recovery step', async () => {
    const storage = memoryStorage()
    const backend = setup(storage)
    await backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'longenough1' })
    await backend.signOut()

    // Unknown addresses look the same as known ones but can't recover anything.
    await backend.requestPasswordReset('nobody@b.co')
    await expect(backend.updatePassword('newpass123')).rejects.toThrow(MESSAGES.linkExpired)

    await backend.requestPasswordReset('A@B.co')
    await expect(backend.updatePassword('longenough1')).rejects.toThrow(MESSAGES.samePassword)
    await backend.updatePassword('newpass123')
    expect((await backend.getSession())?.email).toBe('a@b.co')

    await backend.signOut()
    await expect(backend.signIn({ email: 'a@b.co', password: 'longenough1' })).rejects.toThrow(
      MESSAGES.wrongCredentials,
    )
    await backend.signIn({ email: 'a@b.co', password: 'newpass123' })
  })

  it('deletes an account with its workouts, attendance and messages', async () => {
    const storage = memoryStorage()
    const backend = setup(storage)
    await backend.signUp({ name: 'Ana', email: 'a@b.co', password: 'longenough1' })
    const { userId } = (await backend.getSession())!
    await backend.joinSlot(coffeeRun.id)
    await backend.sendMessage(coffeeRun.id, 'Labas!')
    const own = await backend.createSlot({
      title: 'Rytinis ratas',
      sportType: 'RUN',
      date: TODAY,
      startTime: '18:00',
      endTime: '19:00',
      distanceKm: 8,
      targetPace: '5:30 /km',
      vibeTag: 'SOCIAL_CHAT',
      description: null,
      meetingPoint: { name: 'Vingio parkas', lat: 54.68, lng: 25.23 },
      maxParticipants: null,
    })

    await backend.deleteAccount()
    expect(await backend.getSession()).toBeNull()
    expect(await backend.getSlot(own.id)).toBeNull()
    expect(await backend.getProfile(userId)).toBeNull()
    const coffee = await backend.getSlot(coffeeRun.id)
    expect(coffee?.participants.some((p) => p.id === userId)).toBe(false)
    await expect(backend.signIn({ email: 'a@b.co', password: 'longenough1' })).rejects.toThrow(
      MESSAGES.wrongCredentials,
    )

    await backend.signInAsSample!()
    expect(await backend.listMessages(coffeeRun.id)).not.toContainEqual(
      expect.objectContaining({ content: 'Labas!' }),
    )
  })

  it('limits how fast one person can post', async () => {
    const backend = setup()
    await backend.signInAsSample!()
    for (let i = 0; i < 20; i++) await backend.sendMessage(coffeeRun.id, `Žinutė ${i}`)
    await expect(backend.sendMessage(coffeeRun.id, 'Dar viena')).rejects.toThrow(
      MESSAGES.rateLimited,
    )
  })

  it('shows only the workouts around the chosen town', async () => {
    const backend = setup()
    const range = { from: TODAY, to: '2026-10-26' }
    const vilnius = await backend.listSlots(range, { lat: 54.6872, lng: 25.2797, radiusKm: 22 })
    const kaunas = await backend.listSlots(range, { lat: 54.8985, lng: 23.9036, radiusKm: 18 })
    const all = await backend.listSlots(range)
    expect(kaunas.length).toBeGreaterThan(0)
    expect(kaunas.every((s) => s.meetingPoint.lng < 24.2)).toBe(true)
    expect(vilnius.some((s) => kaunas.some((k) => k.id === s.id))).toBe(false)
    expect(vilnius.length + kaunas.length).toBeLessThan(all.length) // Klaipėda is in neither
  })

  it('ranks people by finished workouts, leaving out ones still to come', async () => {
    const backend = setup()
    const board = await backend.getLeaderboard({ from: '2026-10-06', to: '2026-10-12' }, null)
    const gabija = board.find((e) => e.user.id === MOCK_USERS[0]!.id)!
    // The past week: 10 + 9 + 21 km with others, and hosting a 12 km evening run.
    expect(gabija).toMatchObject({ runKm: 52, workouts: 4, hosted: 1 })
    // At 09:00 the 06:00 and 06:30 workouts have finished; 18:00 ones haven't.
    const today = await backend.getLeaderboard({ from: TODAY, to: TODAY }, null)
    expect(today.reduce((sum, e) => sum + e.workouts, 0)).toBeGreaterThan(0)
    const kaunas = await backend.getLeaderboard(
      { from: '2026-10-06', to: TODAY },
      { lat: 54.8985, lng: 23.9036, radiusKm: 18 },
    )
    expect(kaunas.map((e) => e.workouts)).toEqual([1, 1, 1])
  })

  it('sets and removes a profile photo', async () => {
    const backend = setup()
    await backend.signUp({ name: 'Ana Runner', email: 'ana@example.com', password: 'longenough1' })
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' })
    const withPhoto = await backend.setAvatar(photo)
    expect(withPhoto.avatarUrl).toMatch(/^data:image\/webp;base64,/)
    expect((await backend.getProfile(withPhoto.id))?.avatarUrl).toBe(withPhoto.avatarUrl)
    expect((await backend.setAvatar(null)).avatarUrl).toBeNull()
  })
})
