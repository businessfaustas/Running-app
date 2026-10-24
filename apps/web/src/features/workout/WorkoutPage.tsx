import { paceFit, usualPace, type Participant, type SlotDetail } from '@pacemates/shared'
import { awayFromLithuania, todayISO } from '../../lib/clock'
import clsx from 'clsx'
import {
  ArrowRight,
  CalendarX2,
  Check,
  ChevronRight,
  HeartPulse,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share,
  ShieldCheck,
} from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button, ButtonLink } from '../../components/Button'
import { roundButtonClass } from '../../components/buttonClass'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { TopBar } from '../../components/TopBar'
import { factFor } from '../../content/inspiration'
import { useSession } from '../../data/auth'
import {
  useCancelSlot,
  useJoinSlot,
  useLeaveSlot,
  useMe,
  useMessages,
  useSlot,
} from '../../data/hooks'
import { track } from '../../lib/analytics'
import { celebrate } from '../../lib/celebrate'
import {
  countOf,
  duration,
  firstName,
  formatKm,
  isPast,
  relativeDay,
  WORDS,
} from '../../lib/format'
import { photoFor } from '../../lib/photos'
import { toast, toastError } from '../../lib/toast'
import { SPORT_META, VIBE_META } from '../slots/meta'
import { PaceFitBadge } from './PaceFitBadge'

export function WorkoutPage() {
  const { id = '' } = useParams()
  const slotQuery = useSlot(id)

  if (slotQuery.isPending) return <WorkoutSkeleton />
  if (slotQuery.isError) {
    return (
      <div className="flex h-full flex-col">
        <TopBar />
        <ErrorState error={slotQuery.error} onRetry={() => slotQuery.refetch()} />
      </div>
    )
  }
  if (!slotQuery.data) {
    return (
      <div className="flex h-full flex-col">
        <TopBar />
        <EmptyState Icon={CalendarX2} title="Treniruotė nerasta">
          Galbūt ji ištrinta arba nuoroda neteisinga.
        </EmptyState>
      </div>
    )
  }
  return <WorkoutDetail slot={slotQuery.data} />
}

function WorkoutDetail({ slot }: { slot: SlotDetail }) {
  const session = useSession()
  const me = useMe()
  const sport = SPORT_META[slot.sportType]
  const vibe = VIBE_META[slot.vibeTag]
  const today = todayISO()
  const myEntry = slot.participants.find((p) => p.id === session?.userId)
  const isMember = myEntry?.status === 'ACCEPTED'
  const going = slot.participants.filter((p) => p.status === 'ACCEPTED')
  const time = duration(slot.startTime, slot.endTime)
  const myFit = me.data
    ? paceFit(slot.targetPace, slot.sportType, slot.vibeTag, me.data.defaultPaces)
    : null
  const fact = factFor(slot.sportType, slot.id)

  return (
    <div className="flex h-full flex-col" style={{ '--accent': sport.accent } as CSSProperties}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative h-[400px] shrink-0 overflow-hidden">
          <img
            src={photoFor(slot.sportType, slot.vibeTag)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-black/50" />
          <TopBar overlay fallback="/" actions={<ShareButton slot={slot} />} />

          <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-(--accent) px-3 py-1 text-[12px] font-bold text-black">
                <sport.Icon className="size-3.5" aria-hidden />
                {sport.label}
              </span>
              <span className="glass rounded-full px-3 py-1 text-[12px] font-bold text-white">
                {relativeDay(slot.date, today)}, {slot.startTime}
              </span>
            </div>
            <h1 className="headline mt-3 text-[44px] text-white drop-shadow-lg">{slot.title}</h1>
            <Link
              to={`/athletes/${slot.host.id}`}
              className="glass mt-4 flex w-fit max-w-full items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 transition hover:bg-white/15"
            >
              <Avatar user={slot.host} size={34} />
              <span className="min-w-0 leading-tight">
                <span className="block text-[11px] text-white/70">Organizuoja</span>
                <span className="block truncate text-[14px] font-bold text-white">
                  {slot.host.name}
                </span>
              </span>
              <ChevronRight className="size-4 text-white/60" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="px-5 pb-8">
          {slot.status === 'CANCELLED' && (
            <p className="mb-3 rounded-2xl bg-blaze/15 px-5 py-3 text-sm font-semibold text-[#ff9466]">
              Organizatorius atšaukė šią treniruotę.
            </p>
          )}

          {awayFromLithuania() && (
            <p className="mb-2 text-[12px] font-semibold text-slate-400">
              Laikas nurodytas Lietuvos laiku.
            </p>
          )}
          <dl className="grid grid-cols-3 gap-2">
            <Stat label="Pradžia" value={slot.startTime} sub={time ?? 'Laisva pabaiga'} />
            <Stat label="Atstumas" value={formatKm(slot.distanceKm)} unit="km" />
            <Stat
              label={sport.measure === 'pace' ? 'Tempas' : 'Greitis'}
              value={slot.targetPace}
              small
            />
          </dl>

          {myFit && !isMember && me.data && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-slate-400">
              <PaceFitBadge fit={myFit} />
              <span>
                Tavo įprastas: {usualPace(slot.sportType, slot.vibeTag, me.data.defaultPaces)}
              </span>
            </p>
          )}

          <section className="mt-4 rounded-[24px] border border-white/[0.06] bg-surface p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--accent)/15 text-(--accent)">
                <vibe.Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-bold text-white">{vibe.label}</p>
                <p className="text-[13px] text-slate-400">{vibe.blurb}</p>
              </div>
            </div>
            {slot.description && (
              <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line text-slate-300">
                {slot.description}
              </p>
            )}
          </section>

          <Section title="Susitikimo vieta">
            <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-surface">
              <div className="h-40">
                <LazyLocationMap point={slot.meetingPoint} accent={sport.accent} zoom={14.5} />
              </div>
              <div className="flex items-center gap-3 p-3.5">
                <MapPin className="size-5 shrink-0 text-(--accent)" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[15px] leading-snug font-bold text-white">
                    {slot.meetingPoint.name}
                  </p>
                  <p className="text-[13px] text-slate-500">
                    {relativeDay(slot.date, today)}, {slot.startTime}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${slot.meetingPoint.lat},${slot.meetingPoint.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-black transition active:scale-95"
                >
                  <Navigation className="size-3.5" aria-hidden />
                  Maršrutas
                </a>
              </div>
            </div>
          </Section>

          <Section
            title="Dalyvauja"
            aside={
              <span className="font-bold text-slate-400 tabular">
                {slot.participantCount}
                {slot.maxParticipants ? ` iš ${slot.maxParticipants}` : ''}
              </span>
            }
          >
            {isMember ? (
              <ul className="rounded-[24px] border border-white/[0.06] bg-surface px-3.5">
                {going.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    slot={slot}
                    isMe={p.id === session?.userId}
                  />
                ))}
              </ul>
            ) : (
              // Who's going stays among the group, so nobody can look up where a person will be.
              <p className="flex items-start gap-3 rounded-[24px] border border-white/[0.06] bg-surface px-4 py-3.5 text-[14px] leading-snug text-slate-300">
                <Lock className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                Dalyvių vardus mato tik prisijungę prie šios treniruotės – taip saugome, kur ir kada
                sportuoja kiekvienas.
              </p>
            )}
            {slot.maxParticipants && slot.status !== 'CANCELLED' && (
              <SpotsLeft taken={slot.participantCount} max={slot.maxParticipants} />
            )}
          </Section>

          <Section title="Grupės pokalbis">
            <ChatTeaser slot={slot} isMember={isMember} />
          </Section>

          <Section title="Saugiai">
            <ul className="space-y-2.5 rounded-[24px] border border-white/[0.06] bg-surface p-4 text-[14px] leading-snug text-slate-300">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden />
                Susitikite viešoje vietoje ir pasakyk artimiesiems, kur ir su kuo sportuosi.
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden />
                <span>
                  Pasiimk telefoną. Skubiai pagalbai skambink{' '}
                  <strong className="text-white">112</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <HeartPulse className="mt-0.5 size-4 shrink-0 text-volt" aria-hidden />
                <span>
                  Dalyvauji savo atsakomybe – rinkis tempą pagal jėgas.{' '}
                  <Link to="/salygos" className="font-bold text-white underline">
                    Sąlygos
                  </Link>
                </span>
              </li>
            </ul>
          </Section>

          <Link
            to="/inspire"
            className="relative mt-7 block overflow-hidden rounded-[24px] bg-blue p-5 transition active:scale-[0.99]"
          >
            <span
              aria-hidden
              className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-xl"
            />
            <span className="relative flex items-center gap-1.5 text-[12px] font-bold tracking-[0.14em] text-white/90 uppercase">
              <Lightbulb className="size-3.5" aria-hidden />
              Ar žinojai?
            </span>
            <span className="headline relative mt-2 block text-[52px] text-volt">
              {fact.figure}
            </span>
            <span className="relative mt-1 block text-[15px] leading-snug text-white/90">
              {fact.text}
            </span>
            <span className="relative mt-3 flex items-center gap-1 text-[13px] font-bold text-white">
              Daugiau įkvėpimo
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        </div>
      </div>

      <ActionBar slot={slot} isMember={isMember} />
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  sub,
  small = false,
}: {
  label: string
  value: string
  unit?: string
  sub?: string | null
  small?: boolean
}) {
  return (
    <div className="min-w-0 rounded-[20px] border border-white/[0.06] bg-surface px-3 py-3">
      <dt className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{label}</dt>
      <dd
        className={clsx(
          'mt-1 font-display leading-none font-bold text-white tabular',
          small ? 'text-[19px]' : 'text-[28px]',
        )}
      >
        {value}
        {unit && <span className="ml-0.5 text-[15px] text-slate-400">{unit}</span>}
      </dd>
      {sub && <dd className="mt-1 text-[12px] text-slate-500">{sub}</dd>}
    </div>
  )
}

function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="headline text-[21px] text-white">{title}</h2>
        {aside && <span className="text-[13px]">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function ParticipantRow({
  participant,
  slot,
  isMe,
}: {
  participant: Participant
  slot: SlotDetail
  isMe: boolean
}) {
  const pace = usualPace(slot.sportType, slot.vibeTag, participant.defaultPaces)
  const fit = paceFit(slot.targetPace, slot.sportType, slot.vibeTag, participant.defaultPaces)
  const dot = fit === 'match' ? 'bg-volt' : fit === 'close' ? 'bg-dune' : 'bg-slate-600'

  return (
    <li className="border-b border-white/[0.06] last:border-0">
      <Link
        to={`/athletes/${participant.id}`}
        className="flex items-center gap-3 py-3 transition hover:opacity-90"
      >
        <Avatar user={participant} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">
            {participant.name}
            {isMe && <span className="text-slate-500"> (tu)</span>}
          </p>
          {participant.isHost && (
            <p className="text-[12px] font-semibold text-(--accent)">Organizatorius</p>
          )}
        </div>
        {pace && (
          <span
            className="flex items-center gap-1.5 text-[12.5px] text-slate-400 tabular"
            title={fit ? 'Įprastas tempas, palyginti su treniruotės tikslu' : undefined}
          >
            <span aria-hidden className={clsx('size-1.5 rounded-full', dot)} />
            {pace}
          </span>
        )}
      </Link>
    </li>
  )
}

function SpotsLeft({ taken, max }: { taken: number; max: number }) {
  const left = Math.max(0, max - taken)
  return (
    <div className="mt-3 px-1">
      <div className="h-2 overflow-hidden rounded-full bg-raised">
        <div
          className={clsx('h-full rounded-full', left === 0 ? 'bg-blaze' : 'bg-(--accent)')}
          style={{ width: `${Math.min(100, (taken / max) * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12.5px] font-semibold text-slate-400">
        {left === 0 ? 'Vietų nebėra' : `Liko ${countOf(left, WORDS.spot)}`}
      </p>
    </div>
  )
}

function ChatTeaser({ slot, isMember }: { slot: SlotDetail; isMember: boolean }) {
  const messages = useMessages(slot.id, isMember)
  if (!isMember) {
    return (
      <div className="flex items-center gap-3 rounded-[20px] border border-dashed border-white/15 p-4 text-[13px] text-slate-400">
        <Lock className="size-4 shrink-0" aria-hidden />
        Pokalbį skaityti ir jame rašyti gali tik dalyviai.
      </div>
    )
  }
  const last = messages.data?.at(-1)
  return (
    <Link
      to={`/workouts/${slot.id}/chat`}
      className="flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-surface p-4 transition hover:bg-raised"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue text-white">
        <MessageCircle className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {last ? (
          <>
            <p className="text-[12px] font-semibold text-slate-500">
              {countOf(messages.data!.length, WORDS.message)}
            </p>
            <p className="truncate text-[14px] text-slate-200">
              <span className="font-bold">{firstName(last.sender.name)}:</span> {last.content}
            </p>
          </>
        ) : (
          <p className="text-[14px] text-slate-300">Žinučių dar nėra. Pasisveikink su grupe!</p>
        )}
      </div>
      <ChevronRight className="size-5 text-slate-600" aria-hidden />
    </Link>
  )
}

function ActionBar({ slot, isMember }: { slot: SlotDetail; isMember: boolean }) {
  const session = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const join = useJoinSlot()
  const leave = useLeaveSlot()
  const cancel = useCancelSlot()
  const [confirm, setConfirm] = useState<'leave' | 'cancel' | null>(null)

  const isHost = session?.userId === slot.host.id
  const finished = isPast(slot.date, slot.startTime, slot.endTime)
  const going = slot.participantCount

  let content: ReactNode
  if (slot.status === 'CANCELLED') {
    content = <p className="w-full text-center text-sm text-slate-400">Ši treniruotė atšaukta</p>
  } else if (finished) {
    content = (
      <p className="w-full text-center text-sm text-slate-400">Ši treniruotė jau pasibaigė</p>
    )
  } else if (!session) {
    content = (
      <>
        <Summary going={going} max={slot.maxParticipants} />
        <ButtonLink to={`/signin?next=${encodeURIComponent(location.pathname)}`} size="lg">
          Prisijunk ir dalyvauk
        </ButtonLink>
      </>
    )
  } else if (isHost) {
    content = (
      <>
        <Button variant="danger" size="lg" onClick={() => setConfirm('cancel')}>
          Atšaukti
        </Button>
        <ButtonLink to={`/workouts/${slot.id}/chat`} size="lg" className="flex-1">
          <MessageCircle className="size-4" aria-hidden />
          Grupės pokalbis
        </ButtonLink>
      </>
    )
  } else if (isMember) {
    content = (
      <>
        <Button variant="secondary" size="lg" onClick={() => setConfirm('leave')}>
          <Check className="size-4 text-volt" strokeWidth={3} aria-hidden />
          Dalyvauju
        </Button>
        <ButtonLink to={`/workouts/${slot.id}/chat`} size="lg" className="flex-1">
          <MessageCircle className="size-4" aria-hidden />
          Pokalbis
        </ButtonLink>
      </>
    )
  } else if (slot.status === 'FULL') {
    content = (
      <>
        <Summary going={going} max={slot.maxParticipants} />
        <Button size="lg" disabled>
          Vietų nebėra
        </Button>
      </>
    )
  } else {
    content = (
      <>
        <Summary going={going} max={slot.maxParticipants} />
        <Button
          size="lg"
          className="min-w-40"
          loading={join.isPending}
          onClick={() =>
            join.mutate(slot.id, {
              onSuccess: () => {
                track('workout_joined', { sport: slot.sportType })
                celebrate({ kind: 'joined', slotId: slot.id, title: slot.title })
              },
              onError: toastError,
            })
          }
        >
          Dalyvausiu
          <ArrowRight className="size-5" strokeWidth={2.5} aria-hidden />
        </Button>
      </>
    )
  }

  return (
    <>
      <div className="shrink-0 rounded-t-[28px] border-t border-white/[0.06] bg-surface px-5 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">{content}</div>
      </div>

      <ConfirmDialog
        open={confirm === 'leave'}
        title="Nebedalyvausi?"
        confirmLabel="Atsisakyti"
        destructive
        busy={leave.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          leave.mutate(slot.id, {
            onSuccess: () => {
              setConfirm(null)
              track('workout_left')
              toast('Atsisakei dalyvavimo')
            },
            onError: toastError,
          })
        }
      >
        {firstName(slot.host.name)} matys vienu dalyviu mažiau. Kol yra vietų, gali vėl prisijungti.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'cancel'}
        title="Atšaukti treniruotę?"
        confirmLabel="Atšaukti treniruotę"
        destructive
        busy={cancel.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          cancel.mutate(slot.id, {
            onSuccess: () => {
              setConfirm(null)
              toast('Treniruotė atšaukta')
              navigate('/', { replace: true })
            },
            onError: toastError,
          })
        }
      >
        Visi dalyviai matys, kad ji atšaukta. Šio veiksmo sugrąžinti negalima.
      </ConfirmDialog>
    </>
  )
}

function Summary({ going, max }: { going: number; max: number | null }) {
  return (
    <p className="leading-none">
      <span className="font-display text-[30px] font-bold text-white tabular">
        {going}
        {max ? <span className="text-slate-500">/{max}</span> : null}
      </span>
      <span className="mt-0.5 block text-[12px] font-semibold text-slate-400">dalyvauja</span>
    </p>
  )
}

function ShareButton({ slot }: { slot: SlotDetail }) {
  const share = async () => {
    const url = window.location.href
    const text = `${slot.title}: ${relativeDay(slot.date, todayISO())}, ${slot.startTime}`
    try {
      if (navigator.share) {
        await navigator.share({ title: slot.title, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast('Nuoroda nukopijuota')
      }
    } catch {
      // The share sheet was dismissed.
    }
  }
  return (
    <button type="button" onClick={share} aria-label="Dalintis" className={roundButtonClass()}>
      <Share className="size-[18px]" aria-hidden />
    </button>
  )
}

function WorkoutSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="relative h-[400px] animate-pulse bg-surface">
        <TopBar overlay />
      </div>
      <div className="space-y-3 px-5 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-[20px] bg-surface" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-[24px] bg-surface" />
      </div>
    </div>
  )
}
