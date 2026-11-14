import { Check, MapPin, MessageCircle, Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { QUOTES } from '../content/inspiration'
import { SPORT_META } from '../features/slots/meta'
import { dismissCelebration, useCelebration } from '../lib/celebrate'
import { todayISO } from '../lib/clock'
import { firstName, formatKm, relativeDay, startsIn } from '../lib/format'
import { toast } from '../lib/toast'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { SportArt } from './SportArt'

const SPARKS = 18
const CONFETTI = 26
const CONFETTI_COLORS = ['var(--color-volt)', '#ffffff', 'var(--color-blue)', 'var(--color-ice)']

/** A different line for each workout, but the same one if the overlay re-renders. */
function quoteFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return QUOTES[Math.abs(h) % QUOTES.length]!
}

/**
 * The moment after joining or posting a workout: its photo, confetti, and the workout as a
 * ticket – when, how far, where – so the screen confirms what you signed up for.
 */
export function CelebrationOverlay() {
  const current = useCelebration((s) => s.current)
  const navigate = useNavigate()
  const primaryRef = useRef<HTMLButtonElement>(null)
  const slotId = current?.slot.id

  // A fresh burst for every celebration; spread evenly rather than at random, so it never
  // clumps and looks the same on re-render.
  const { sparks, confetti } = useMemo(
    () => ({
      sparks: Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2
        const distance = 70 + ((i * 37) % 60)
        return {
          dx: `${Math.cos(angle) * distance}px`,
          dy: `${Math.sin(angle) * distance}px`,
          size: 5 + ((i * 13) % 7),
          color: i % 3 === 0 ? '#ffffff' : 'var(--color-volt)',
          delay: `${250 + (i % 5) * 40}ms`,
        }
      }),
      confetti: Array.from({ length: CONFETTI }, (_, i) => ({
        left: `${((i * 53) % 100) + 0.5}%`,
        width: 6 + ((i * 7) % 5),
        height: 10 + ((i * 11) % 9),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        delay: `${(i * 67) % 900}ms`,
        duration: `${2400 + ((i * 131) % 1600)}ms`,
        drift: `${((i * 29) % 80) - 40}px`,
        round: i % 4 === 0,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slotId],
  )

  useEffect(() => {
    if (slotId) primaryRef.current?.focus({ preventScroll: true })
  }, [slotId])

  if (!current) return null
  const { slot } = current
  const joined = current.kind === 'joined'
  const sport = SPORT_META[slot.sportType]
  const quote = quoteFor(slot.id)
  const crew = [slot.host, ...slot.participantPreview].slice(0, 3)
  // "Šiandien" / "Rytoj" fit under the time; a full date doesn't, and the chip above has it.
  const day = relativeDay(slot.date, todayISO())
  const dayLabel = day.length <= 8 ? day : 'Pradžia'

  const share = async () => {
    const url = `${window.location.origin}/workouts/${slot.id}`
    try {
      if (navigator.share) await navigator.share({ title: slot.title, url })
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
      className="absolute inset-0 z-50 overflow-hidden bg-ink animate-fade"
      style={{ '--accent': sport.accent } as CSSProperties}
    >
      {/* The workout's photo fills the top and melts into the page. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[58%] overflow-hidden">
        <SportArt sport={slot.sportType} vibe={slot.vibeTag} className="animate-ken" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/45 to-ink" />
        <div className="absolute -bottom-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-blue/45 blur-3xl" />
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute -top-6"
            style={
              {
                left: c.left,
                width: c.width,
                height: c.round ? c.width : c.height,
                borderRadius: c.round ? '50%' : 2,
                background: c.color,
                animation: `confetti ${c.duration} cubic-bezier(0.3, 0.2, 0.6, 1) ${c.delay} both`,
                '--drift': c.drift,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="scrollbar-none relative h-full overflow-y-auto">
        <div className="stagger mx-auto flex min-h-full max-w-md flex-col justify-end px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <div className="relative grid size-16 place-items-center">
            {sparks.map((s, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute top-1/2 left-1/2 rounded-full animate-burst"
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
            <span className="grid size-16 place-items-center rounded-full bg-volt text-black shadow-[0_0_50px_rgb(212_255_63/0.55)] ring-8 ring-volt/15 animate-pop">
              <Check className="size-8" strokeWidth={3.2} aria-hidden />
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[12px] font-bold tracking-[0.14em] text-volt uppercase">
              {joined ? 'Vieta tavo' : 'Treniruotė kalendoriuje'}
            </p>
            <h2
              id="celebration-title"
              className="headline mt-1.5 text-[52px] max-[359px]:text-[42px]"
            >
              {joined ? 'Tu dalyvauji!' : 'Paskelbta!'}
            </h2>
          </div>

          {/* The workout as a ticket: what, then – below the tear line – when, how far, where. */}
          <div className="relative mt-5 rounded-[28px] border border-white/10 bg-surface/90 backdrop-blur-xl">
            <div className="p-4 pb-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-(--accent) px-2.5 py-1 text-[12px] font-bold text-black">
                  <sport.Icon className="size-3.5" aria-hidden />
                  {sport.label}
                </span>
                <span className="text-[12px] font-bold text-slate-300">
                  {startsIn(slot.date, slot.startTime)}
                </span>
              </div>
              <p className="headline mt-2.5 text-[22px] text-white">{slot.title}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-slate-300">
                <MapPin className="size-4 shrink-0 text-(--accent)" aria-hidden />
                <span className="truncate">{slot.meetingPoint.name}</span>
              </p>
            </div>

            <div aria-hidden className="relative h-0 border-t border-dashed border-white/15">
              <span className="absolute top-1/2 -left-[11px] size-5 -translate-y-1/2 rounded-full bg-ink" />
              <span className="absolute top-1/2 -right-[11px] size-5 -translate-y-1/2 rounded-full bg-ink" />
            </div>

            <dl className="grid grid-cols-3 divide-x divide-white/10 px-1 py-3.5 text-center">
              <TicketStat label={dayLabel} value={slot.startTime} />
              <TicketStat label="Atstumas" value={formatKm(slot.distanceKm)} unit="km" />
              <TicketStat label="Tempas" value={slot.targetPace} small />
            </dl>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex shrink-0">
              {crew.map((user, i) => (
                <Avatar
                  key={user.id}
                  user={user}
                  size={32}
                  className={i > 0 ? '-ml-2.5 ring-2 ring-ink' : 'ring-2 ring-ink'}
                />
              ))}
            </span>
            <p className="min-w-0 text-[13px] leading-snug text-slate-300">
              {joined ? (
                <>
                  Organizuoja{' '}
                  <span className="font-bold text-white">{firstName(slot.host.name)}</span>. Grupė
                  jau žino, kad ateini.
                </>
              ) : (
                <>Kiti jau mato tavo treniruotę. Pakviesk draugų – kartu smagiau.</>
              )}
            </p>
          </div>

          <p className="mt-4 text-[13px] leading-relaxed text-slate-400 italic [@media(max-height:760px)]:hidden">
            „{quote.text}“{quote.author && <span className="not-italic"> – {quote.author}</span>}
          </p>

          <div className="mt-5 flex gap-2.5">
            <Button variant="glass" size="lg" className="shrink-0" onClick={dismissCelebration}>
              Puiku
            </Button>
            {joined ? (
              <Button
                ref={primaryRef}
                size="lg"
                className="min-w-0 flex-1"
                onClick={() => {
                  dismissCelebration()
                  navigate(`/workouts/${slot.id}/chat`)
                }}
              >
                <MessageCircle className="size-5" aria-hidden />Į pokalbį
              </Button>
            ) : (
              <Button ref={primaryRef} size="lg" className="min-w-0 flex-1" onClick={share}>
                <Share2 className="size-5" aria-hidden />
                Pakviesk draugų
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TicketStat({
  label,
  value,
  unit,
  small = false,
}: {
  label: string
  value: string
  unit?: string
  small?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse px-2">
      <dt className="mt-1 truncate text-[11px] font-bold tracking-wider text-slate-500 uppercase">
        {label}
      </dt>
      <dd
        className={
          small
            ? 'line-clamp-2 font-display text-[15px] leading-[1.15] font-bold text-white tabular'
            : 'truncate font-display text-[26px] leading-none font-bold text-white tabular'
        }
      >
        {value}
        {unit && <span className="ml-0.5 text-[0.55em] text-slate-400">{unit}</span>}
      </dd>
    </div>
  )
}
