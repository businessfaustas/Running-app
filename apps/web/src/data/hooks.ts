import type { NewSlotInput, ProfileUpdate } from '@grouppace/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { backend } from '../backend'
import { useSession } from './auth'

export const keys = {
  slots: (from: string, to: string) => ['slots', from, to] as const,
  slot: (id: string) => ['slot', id] as const,
  userSlots: (userId: string) => ['userSlots', userId] as const,
  profile: (id: string) => ['profile', id] as const,
  messages: (slotId: string) => ['messages', slotId] as const,
  threads: (userId: string) => ['threads', userId] as const,
}

export function useSlots(from: string, to: string) {
  return useQuery({
    queryKey: keys.slots(from, to),
    queryFn: () => backend.listSlots({ from, to }),
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
  return useMutation({ mutationFn: backend.joinSlot, onSettled: invalidate })
}

export function useLeaveSlot() {
  const invalidate = useInvalidateSlots()
  return useMutation({ mutationFn: backend.leaveSlot, onSettled: invalidate })
}

export function useCancelSlot() {
  const invalidate = useInvalidateSlots()
  return useMutation({ mutationFn: backend.cancelSlot, onSettled: invalidate })
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
