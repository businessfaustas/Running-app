import type { Area, NewRacePost, NewSlotInput, ProfileUpdate } from '@pacemates/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { backend } from '../backend'
import { useSession } from './auth'

export const keys = {
  slots: (from: string, to: string, area: Area | null) =>
    ['slots', from, to, area ? `${area.lat},${area.lng},${area.radiusKm}` : 'all'] as const,
  leaderboard: (from: string, to: string, area: Area | null) =>
    ['leaderboard', from, to, area ? `${area.lat},${area.lng},${area.radiusKm}` : 'all'] as const,
  slot: (id: string) => ['slot', id] as const,
  userSlots: (userId: string) => ['userSlots', userId] as const,
  profile: (id: string) => ['profile', id] as const,
  messages: (slotId: string) => ['messages', slotId] as const,
  threads: (userId: string) => ['threads', userId] as const,
  raceCounts: ['raceCounts'] as const,
  raceAttendees: (slug: string) => ['raceAttendees', slug] as const,
  racePosts: (slug: string) => ['racePosts', slug] as const,
  userRaces: (userId: string) => ['userRaces', userId] as const,
}

/** Workouts in the date range; with an area, only those around it (e.g. the chosen town). */
export function useSlots(from: string, to: string, area: Area | null = null) {
  return useQuery({
    queryKey: keys.slots(from, to, area),
    queryFn: () => backend.listSlots({ from, to }, area),
  })
}

export function useLeaderboard(from: string, to: string, area: Area | null) {
  return useQuery({
    queryKey: keys.leaderboard(from, to, area),
    queryFn: () => backend.getLeaderboard({ from, to }, area),
  })
}

export function useSlot(id: string | undefined) {
  return useQuery({
    queryKey: keys.slot(id ?? ''),
    queryFn: () => backend.getSlot(id!),
    enabled: Boolean(id),
  })
}

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: keys.profile(id ?? ''),
    queryFn: () => backend.getProfile(id!),
    enabled: Boolean(id),
  })
}

/** The signed-in athlete's profile (undefined while signed out). */
export function useMe() {
  const session = useSession()
  return useProfile(session?.userId)
}

export function useUserSlots(userId: string | undefined) {
  return useQuery({
    queryKey: keys.userSlots(userId ?? ''),
    queryFn: () => backend.listUserSlots(userId!),
    enabled: Boolean(userId),
  })
}

export function useMessages(slotId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    return backend.subscribeToMessages(slotId, () => {
      void queryClient.invalidateQueries({ queryKey: keys.messages(slotId) })
    })
  }, [enabled, queryClient, slotId])

  return useQuery({
    queryKey: keys.messages(slotId),
    queryFn: () => backend.listMessages(slotId),
    enabled,
  })
}

export function useThreads() {
  const session = useSession()
  return useQuery({
    queryKey: keys.threads(session?.userId ?? ''),
    queryFn: () => backend.listThreads(),
    enabled: Boolean(session),
  })
}

/** After anything that changes attendance, refresh every view that shows it. */
/*
 * After a change, refresh what it touched. On success the button waits for the fresh data, so
 * it doesn't flicker back; on failure it doesn't – the error shows at once, even on a slow line.
 */
const refreshAfter = (invalidate: () => Promise<unknown>) => ({
  onSuccess: invalidate,
  onError: () => void invalidate(),
})

function useInvalidateSlots() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      ['slots', 'slot', 'userSlots', 'threads', 'messages'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    )
}

export function useJoinSlot() {
  const invalidate = useInvalidateSlots()
  return useMutation({ mutationFn: backend.joinSlot, ...refreshAfter(invalidate) })
}

export function useLeaveSlot() {
  const invalidate = useInvalidateSlots()
  return useMutation({ mutationFn: backend.leaveSlot, ...refreshAfter(invalidate) })
}

export function useCancelSlot() {
  const invalidate = useInvalidateSlots()
  return useMutation({ mutationFn: backend.cancelSlot, ...refreshAfter(invalidate) })
}

export function useCreateSlot() {
  const invalidate = useInvalidateSlots()
  return useMutation({
    mutationFn: (input: NewSlotInput) => backend.createSlot(input),
    onSuccess: invalidate,
  })
}

export function useSendMessage(slotId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => backend.sendMessage(slotId, content),
    onSuccess: (message) => {
      queryClient.setQueryData(keys.messages(slotId), (old: (typeof message)[] | undefined) =>
        old?.some((m) => m.id === message.id) ? old : [...(old ?? []), message],
      )
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
    },
  })
}

export function useSetAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (image: Blob | null) => backend.setAvatar(image),
    onSuccess: (profile) => {
      queryClient.setQueryData(keys.profile(profile.id), profile)
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'profile' })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => backend.updateProfile(patch),
    onSuccess: (profile) => {
      queryClient.setQueryData(keys.profile(profile.id), profile)
      // Names and photos appear on cards and in chats too.
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'profile' })
    },
  })
}

// ─── Races ───────────────────────────────────────────────────────────────────

export function useRaceCounts() {
  return useQuery({ queryKey: keys.raceCounts, queryFn: () => backend.listRaceAttendance() })
}

export function useRaceAttendees(slug: string) {
  return useQuery({
    queryKey: keys.raceAttendees(slug),
    queryFn: () => backend.listRaceAttendees(slug),
  })
}

export function useUserRaces(userId: string | undefined) {
  return useQuery({
    queryKey: keys.userRaces(userId ?? ''),
    queryFn: () => backend.listUserRaces(userId!),
    enabled: Boolean(userId),
  })
}

/** A race's forum, kept live while the page is open. */
export function useRacePosts(slug: string) {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      backend.subscribeToRace(slug, () => {
        void queryClient.invalidateQueries({ queryKey: keys.racePosts(slug) })
        void queryClient.invalidateQueries({ queryKey: keys.raceAttendees(slug) })
        void queryClient.invalidateQueries({ queryKey: keys.raceCounts })
      }),
    [queryClient, slug],
  )
  return useQuery({ queryKey: keys.racePosts(slug), queryFn: () => backend.listRacePosts(slug) })
}

function useInvalidateRace(slug: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.racePosts(slug) }),
      queryClient.invalidateQueries({ queryKey: keys.raceAttendees(slug) }),
      queryClient.invalidateQueries({ queryKey: keys.raceCounts }),
      queryClient.invalidateQueries({ queryKey: ['userRaces'] }),
    ])
}

export function useSetRaceAttendance(slug: string) {
  const invalidate = useInvalidateRace(slug)
  return useMutation({
    mutationFn: (attendance: { distanceKm: number | null } | null) =>
      backend.setRaceAttendance(slug, attendance),
    ...refreshAfter(invalidate),
  })
}

export function useCreateRacePost(slug: string) {
  const invalidate = useInvalidateRace(slug)
  return useMutation({
    mutationFn: (post: NewRacePost) => backend.createRacePost(slug, post),
    onSuccess: invalidate,
  })
}

export function useDeleteRacePost(slug: string) {
  const invalidate = useInvalidateRace(slug)
  return useMutation({
    mutationFn: (postId: string) => backend.deleteRacePost(postId),
    ...refreshAfter(invalidate),
  })
}
