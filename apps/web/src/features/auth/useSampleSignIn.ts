import { useState } from 'react'
import { useNavigate } from 'react-router'
import { backend } from '../../backend'
import { toastError } from '../../lib/toast'

/** Null outside preview mode, where there are no sample athletes to borrow. */
export function useSampleSignIn(next = '/') {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  if (!backend.signInAsSample) return null

  const signIn = async () => {
    setBusy(true)
    try {
      await backend.signInAsSample?.()
      navigate(next, { replace: true })
    } catch (error) {
      toastError(error)
    } finally {
      setBusy(false)
    }
  }
  return { signIn, busy }
}
