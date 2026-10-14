import { useEffect } from 'react'
import { create } from 'zustand'
import { backend, type Session } from '../backend'
import { authRedirect } from '../lib/authRedirect'
import { setMonitoringUser } from '../lib/monitoring'
import { queryClient } from './queryClient'

interface AuthState {
  session: Session | null
  /** False until the stored session has been read. */
  ready: boolean
  /** Signed in through a password-reset link: the next step is choosing a new password. */
  recovery: boolean
}

export const useAuthStore = create<AuthState>()(() => ({
  session: null,
  ready: false,
  recovery: authRedirect.type === 'recovery',
}))

/** Keeps the auth store in sync with the backend. Call once, near the root. */
export function useAuthSync() {
  useEffect(() => {
    let active = true
    void backend.getSession().then((session) => {
      if (!active) return
      useAuthStore.setState({ session, ready: true })
      setMonitoringUser(session?.userId ?? null)
    })
    const stop = backend.onAuthChange((session, event) => {
      const previous = useAuthStore.getState().session?.userId
      useAuthStore.setState((state) => ({
        session,
        ready: true,
        recovery:
          event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : state.recovery,
      }))
      setMonitoringUser(session?.userId ?? null)
      if (previous !== session?.userId) {
        // Someone else's (or no one's) data must not linger after switching accounts.
        if (!session) queryClient.clear()
        else void queryClient.invalidateQueries()
      }
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
export const finishRecovery = () => useAuthStore.setState({ recovery: false })
