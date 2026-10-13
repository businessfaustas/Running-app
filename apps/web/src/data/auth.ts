import { useEffect } from 'react'
import { create } from 'zustand'
import { backend, type Session } from '../backend'
import { queryClient } from './queryClient'

interface AuthState {
  session: Session | null
  /** False until the stored session has been read. */
  ready: boolean
}

export const useAuthStore = create<AuthState>()(() => ({ session: null, ready: false }))

/** Keeps the auth store in sync with the backend. Call once, near the root. */
export function useAuthSync() {
  useEffect(() => {
    let active = true
    void backend.getSession().then((session) => {
      if (active) useAuthStore.setState({ session, ready: true })
    })
    const stop = backend.onAuthChange((session) => {
      const previous = useAuthStore.getState().session?.userId
      useAuthStore.setState({ session, ready: true })
      if (previous !== session?.userId) void queryClient.invalidateQueries()
    })
    const stopChanges = backend.subscribeToChanges(() => void queryClient.invalidateQueries())
    return () => {
      active = false
      stop()
      stopChanges()
    }
  }, [])
}

export const useSession = () => useAuthStore((s) => s.session)
export const useAuthReady = () => useAuthStore((s) => s.ready)
