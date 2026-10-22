import { Check } from 'lucide-react'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { QUOTES } from '../content/inspiration'
import { dismissCelebration, useCelebration } from '../lib/celebrate'
import { toast } from '../lib/toast'
import { Button } from './Button'

const SPARKS = 22

/** A different line for each workout, but the same one if the overlay re-renders. */
function quoteFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return QUOTES[Math.abs(h) % QUOTES.length]!
}

export function CelebrationOverlay() {
  const current = useCelebration((s) => s.current)
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)

  const sparks = useMemo(
    () =>
      Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2
        const distance = 110 + ((i * 37) % 90)
        return {
          dx: `${Math.cos(angle) * distance}px`,
          dy: `${Math.sin(angle) * distance}px`,
          size: 6 + ((i * 13) % 9),
          color: i % 3 === 0 ? '#ffffff' : 'var(--color-volt)',
          delay: `${(i % 5) * 40}ms`,
        }
      }),
    // A fresh burst for every celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current?.slotId],
  )
  const quote = quoteFor(current?.slotId ?? '')

  useEffect(() => {
    if (current) closeRef.current?.focus()
  }, [current])

  if (!current) return null
  const joined = current.kind === 'joined'

  const share = async () => {
    const url = `${window.location.origin}/workouts/${current.slotId}`
    try {
      if (navigator.share) await navigator.share({ title: current.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Nuoroda nukopijuota')
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-blue px-6 motion-safe:animate-fade"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 38%, rgb(255 255 255 / 0.22), transparent 55%)',
      }}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative grid size-28 place-items-center">
          {sparks.map((s, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute top-1/2 left-1/2 rounded-full motion-safe:animate-burst"
              style={
                {
                  width: s.size,
                  height: s.size,
                  marginLeft: -s.size / 2,
                  marginTop: -s.size / 2,
                  background: s.color,
                  animationDelay: s.delay,
                  '--dx': s.dx,
                  '--dy': s.dy,
                } as CSSProperties
              }
            />
          ))}
          <span className="grid size-28 place-items-center rounded-full bg-volt text-black shadow-[0_0_60px_rgb(212_255_63/0.6)] motion-safe:animate-pop">
            <Check className="size-14" strokeWidth={3} aria-hidden />
          </span>
        </div>

        <h2 id="celebration-title" className="headline mt-8 text-[56px]">
          {joined ? 'Tu dalyvauji!' : 'Paskelbta!'}
        </h2>
        <p className="mt-2 text-[15px] font-semibold text-white/90">{current.title}</p>
        <p className="mt-6 text-[15px] text-white/90">„{quote.text}“</p>
        {quote.author && <p className="mt-1 text-[13px] text-white/90">– {quote.author}</p>}

        <div className="mt-9 flex w-full flex-col gap-2.5">
          {joined ? (
            <Button
              size="lg"
              onClick={() => {
                dismissCelebration()
                navigate(`/workouts/${current.slotId}/chat`)
              }}
            >
              Pasisveikink pokalbyje
            </Button>
          ) : (
            <Button size="lg" onClick={share}>
              Pakviesk draugų
            </Button>
          )}
          <Button ref={closeRef} variant="glass" size="lg" onClick={dismissCelebration}>
            Puiku
          </Button>
        </div>
      </div>
    </div>
  )
}
