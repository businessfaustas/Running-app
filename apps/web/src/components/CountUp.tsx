import { useEffect, useRef, useState } from 'react'

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/**
 * A number that runs up to its value: from zero when it first appears, from the previous value
 * when it changes. Screen readers and reduced-motion users get the final number straight away.
 */
export function CountUp({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = 700,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
}) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0))
  const from = useRef(shown)

  useEffect(() => {
    if (reducedMotion() || from.current === value) {
      from.current = value
      setShown(value)
      return
    }
    const start = from.current
    const began = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - t) ** 3
      const current = start + (value - start) * eased
      from.current = current
      setShown(t === 1 ? value : current)
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
