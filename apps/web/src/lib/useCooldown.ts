import { useEffect, useState } from 'react'

/** Seconds left before an action (e.g. "send the email again") can be repeated. */
export function useCooldown() {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (until <= now) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [until, now])

  return {
    remaining: Math.max(0, Math.ceil((until - now) / 1000)),
    start: (seconds: number) => {
      const at = Date.now()
      setNow(at)
      setUntil(at + seconds * 1000)
    },
  }
}
