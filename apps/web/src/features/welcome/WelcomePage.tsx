import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { PHOTOS } from '../../lib/photos'
import { markWelcomeSeen } from '../../lib/welcome'

const SLIDES = [
  {
    photo: PHOTOS.runCoast,
    title: ['Bėk. Mink.', 'Kartu.'],
    text: 'Rask, su kuo bėgti ar minti – bet kuriuo paros metu.',
  },
  {
    photo: PHOTOS.runCrew,
    title: ['Rask savo', 'tempą.'],
    text: 'Dar prieš prisijungdamas matai, ar grupė bėga tavo tempu.',
  },
  {
    photo: PHOTOS.rideGroup,
    title: ['Visa para.', 'Visas miestas.'],
    text: 'Visos miesto treniruotės vienoje 24 valandų juostoje.',
  },
]

const AUTO_ADVANCE_MS = 5000

export function WelcomePage() {
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [touched, setTouched] = useState(false)

  const goTo = (i: number) => {
    const track = trackRef.current
    track?.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
  }

  // Gently move through the slides until the visitor takes over.
  useEffect(() => {
    if (touched) return
    const id = setInterval(() => goTo((index + 1) % SLIDES.length), AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [index, touched])

  const leave = (to: string) => {
    markWelcomeSeen()
    navigate(to, { replace: true })
  }

  return (
    <div className="relative h-full overflow-hidden bg-black">
      <div
        ref={trackRef}
        onPointerDown={() => setTouched(true)}
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
        className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {SLIDES.map((slide, i) => (
          <section
            key={slide.photo}
            aria-roledescription="skaidrė"
            aria-label={`${i + 1} iš ${SLIDES.length}`}
            className="relative h-full w-full shrink-0 snap-center overflow-hidden"
          >
            <img
              src={slide.photo}
              alt=""
              className="absolute inset-0 size-full object-cover motion-safe:animate-ken"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/90" />
            <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+132px)] px-6">
              <h1 className="headline text-[64px] text-white drop-shadow-lg">
                {slide.title[0]}
                <br />
                <span className={i === 0 ? 'text-volt' : undefined}>{slide.title[1]}</span>
              </h1>
              <p className="mt-3 max-w-xs text-[16px] leading-snug text-white/85">{slide.text}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+18px)]">
        <Logo className="text-white" size={24} />
        <button
          type="button"
          onClick={() => leave('/')}
          className="glass pointer-events-auto rounded-full px-4 py-2 text-[13px] font-semibold"
        >
          Praleisti
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="mb-5 flex gap-1.5" role="tablist" aria-label="Skaidrės">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1} skaidrė`}
              onClick={() => {
                setTouched(true)
                goTo(i)
              }}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'w-8 bg-volt' : 'w-3 bg-white/40',
              )}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="glass" size="lg" className="flex-1" onClick={() => leave('/signin')}>
            Prisijungti
          </Button>
          <Button variant="light" size="lg" className="flex-1" onClick={() => leave('/')}>
            Pradėti
          </Button>
        </div>
      </div>
    </div>
  )
}
