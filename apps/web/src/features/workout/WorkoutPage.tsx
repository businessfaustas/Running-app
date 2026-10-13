import { paceFit, toISODate, usualPace, type Participant, type SlotDetail } from '@grouppace/shared'
import clsx from 'clsx'
import {
  CalendarX2,
  Check,
  ChevronRight,
  Lock,
  MessageCircle,
  Navigation,
  Share,
} from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button, ButtonLink } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { LazyLocationMap } from '../../components/maps/LazyLocationMap'
import { TopBar } from '../../components/TopBar'
import { useSession } from '../../data/auth'
import {
  useCancelSlot,
  useJoinSlot,
  useLeaveSlot,
  useMe,
  useMessages,
  useSlot,
} from '../../data/hooks'
import { duration, firstName, formatKm, isPast, relativeDay } from '../../lib/format'
import { toast, toastError } from '../../lib/toast'
import { SPORT_META, VIBE_META } from '../slots/meta'
import { PaceFitBadge } from './PaceFitBadge'

export function WorkoutPage() {
  const { id = '' } = useParams()
  const slotQuery = useSlot(id)

  if (slotQuery.isPending) return <WorkoutSkeleton />
  if (!slotQuery.data) {
    return (
      <div className="flex h-full flex-col">
        <TopBar />
        <EmptyState Icon={CalendarX2} title="Workout not found">
          It may have been removed, or the link is wrong.
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
  const today = toISODate(new Date())
  const myEntry = slot.participants.find((p) => p.id === session?.userId)
  const isMember = myEntry?.status === 'ACCEPTED'
  const going = slot.participants.filter((p) => p.status === 'ACCEPTED')
  const time = duration(slot.startTime, slot.endTime)
  const myFit = me.data
    ? paceFit(slot.targetPace, slot.sportType, slot.vibeTag, me.data.defaultPaces)
    : null

  return (
    <div className="flex h-full flex-col" style={{ '--accent': sport.accent } as CSSProperties}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative h-60 shrink-0">
          <LazyLocationMap point={slot.meetingPoint} accent={sport.accent} zoom={14.5} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink to-transparent" />
          <TopBar overlay fallback="/" actions={<ShareButton slot={slot} />} />
        </div>

        <div className="relative -mt-4 px-4 pb-8">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wider text-(--accent) uppercase">
            <sport.Icon className="size-3.5" aria-hidden />
            {sport.label} · {relativeDay(slot.date, today)}
          </p>
          <h1 className="mt-1.5 text-[26px] leading-tight font-bold tracking-tight text-white">
            {slot.title}
          </h1>
          {slot.status === 'CANCELLED' && (
            <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
              The host cancelled this workout.
            </p>
          )}

          <Link
            to={`/athletes/${slot.host.id}`}
            className="mt-4 flex items-center gap-3 rounded-xl py-1 transition hover:opacity-90"
          >
            <Avatar user={slot.host} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-zinc-500">Hosted by</p>
              <p className="truncate text-[15px] font-semibold text-white">{slot.host.name}</p>
            </div>
            <ChevronRight className="size-5 text-zinc-600" aria-hidden />
          </Link>

          <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
            <Stat
              label="Start"
              value={slot.startTime}
              sub={time ?? (slot.endTime ? null : 'Open end')}
            />
            <Stat label="Distance" value={`${formatKm(slot.distanceKm)} km`} />
            <Stat
              label={sport.measure === 'pace' ? 'Pace' : 'Speed'}
              value={slot.targetPace}
              small
            />
          </dl>

          {myFit && !isMember && (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-zinc-400">
              <PaceFitBadge fit={myFit} />
              {me.data && (
                <span>
                  Your usual: {usualPace(slot.sportType, slot.vibeTag, me.data.defaultPaces)}
                </span>
              )}
            </p>
          )}

          <section className="mt-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-zinc-300">
                <vibe.Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-white">{vibe.label}</p>
                <p className="text-[13px] text-zinc-400">{vibe.blurb}</p>
              </div>
            </div>
            {slot.description && (
              <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line text-zinc-300">
                {slot.description}
              </p>
            )}
          </section>

          <Section title="Meeting point">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-white">
                  {slot.meetingPoint.name}
                </p>
                <p className="text-[13px] text-zinc-500">
                  {relativeDay(slot.date, today)} at {slot.startTime}
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${slot.meetingPoint.lat},${slot.meetingPoint.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-raised px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#26262a]"
              >
                <Navigation className="size-3.5" aria-hidden />
                Directions
              </a>
            </div>
          </Section>

          <Section
            title="Going"
            aside={
              <span className="text-zinc-500 tabular">
                {going.length}
                {slot.maxParticipants ? ` of ${slot.maxParticipants}` : ''}
              </span>
            }
          >
            <ul className="divide-y divide-line">
              {going.map((p) => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  slot={slot}
                  isMe={p.id === session?.userId}
                />
              ))}
            </ul>
            {slot.maxParticipants && slot.status !== 'CANCELLED' && (
              <SpotsLeft taken={going.length} max={slot.maxParticipants} />
            )}
          </Section>

          <Section title="Group chat">
            <ChatTeaser slot={slot} isMember={isMember} />
          </Section>
        </div>
      </div>

      <ActionBar slot={slot} isMember={isMember} />
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  small = false,
}: {
  label: string
  value: string
  sub?: string | null
  small?: boolean
}) {
  return (
    <div className="min-w-0 px-3 py-3">
      <dt className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">{label}</dt>
      <dd
        className={clsx(
          'mt-0.5 font-display leading-tight font-bold text-white tabular',
          small ? 'text-[17px]' : 'text-[22px]',
        )}
      >
        {value}
      </dd>
      {sub && <dd className="text-[12px] text-zinc-500">{sub}</dd>}
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
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="font-display text-[17px] font-bold tracking-wide text-white uppercase">
          {title}
        </h2>
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
  const dot = fit === 'match' ? 'bg-volt' : fit === 'close' ? 'bg-dune' : 'bg-zinc-600'

  return (
    <li>
      <Link
        to={`/athletes/${participant.id}`}
        className="flex items-center gap-3 py-2.5 transition hover:opacity-90"
      >
        <Avatar user={participant} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-white">
            {participant.name}
            {isMe && <span className="text-zinc-500"> (you)</span>}
          </p>
          {participant.isHost && <p className="text-[12px] text-zinc-500">Host</p>}
        </div>
        {pace && (
          <span
            className="flex items-center gap-1.5 text-[12.5px] text-zinc-400 tabular"
            title={fit ? `Usual pace compared with this workout's target` : undefined}
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
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className={clsx('h-full rounded-full', left === 0 ? 'bg-blaze' : 'bg-(--accent)')}
          style={{ width: `${Math.min(100, (taken / max) * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12.5px] text-zinc-500">
        {left === 0 ? 'Full' : `${left} ${left === 1 ? 'spot' : 'spots'} left`}
      </p>
    </div>
  )
}

function ChatTeaser({ slot, isMember }: { slot: SlotDetail; isMember: boolean }) {
  const messages = useMessages(slot.id, isMember)
  if (!isMember) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-line p-3.5 text-[13px] text-zinc-400">
        <Lock className="size-4 shrink-0" aria-hidden />
        Only people who are going can read and post in the chat.
      </div>
    )
  }
  const last = messages.data?.at(-1)
  return (
    <Link
      to={`/workouts/${slot.id}/chat`}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 transition hover:bg-[#1a1a1d]"
    >
      <MessageCircle className="size-5 shrink-0 text-zinc-400" aria-hidden />
      <div className="min-w-0 flex-1">
        {last ? (
          <>
            <p className="text-[12px] text-zinc-500">
              {messages.data!.length} {messages.data!.length === 1 ? 'message' : 'messages'}
            </p>
            <p className="truncate text-[14px] text-zinc-200">
              <span className="font-semibold">{firstName(last.sender.name)}:</span> {last.content}
            </p>
          </>
        ) : (
          <p className="text-[14px] text-zinc-300">No messages yet. Say hi to the group.</p>
        )}
      </div>
      <ChevronRight className="size-5 text-zinc-600" aria-hidden />
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
  const going = slot.participants.filter((p) => p.status === 'ACCEPTED').length

  let content: ReactNode
  if (slot.status === 'CANCELLED') {
    content = <p className="w-full text-center text-sm text-zinc-400">This workout was cancelled</p>
  } else if (finished) {
    content = <p className="w-full text-center text-sm text-zinc-400">This workout has finished</p>
  } else if (!session) {
    content = (
      <>
        <Summary going={going} max={slot.maxParticipants} />
        <ButtonLink to={`/signin?next=${encodeURIComponent(location.pathname)}`} size="lg">
          Sign in to join
        </ButtonLink>
      </>
    )
  } else if (isHost) {
    content = (
      <>
        <Button variant="danger" size="lg" onClick={() => setConfirm('cancel')}>
          Cancel workout
        </Button>
        <ButtonLink
          to={`/workouts/${slot.id}/chat`}
          variant="secondary"
          size="lg"
          className="flex-1"
        >
          <MessageCircle className="size-4" aria-hidden />
          Group chat
        </ButtonLink>
      </>
    )
  } else if (isMember) {
    content = (
      <>
        <Button variant="secondary" size="lg" onClick={() => setConfirm('leave')}>
          <Check className="size-4 text-volt" aria-hidden />
          Going
        </Button>
        <ButtonLink to={`/workouts/${slot.id}/chat`} size="lg" className="flex-1">
          <MessageCircle className="size-4" aria-hidden />
          Open chat
        </ButtonLink>
      </>
    )
  } else if (slot.status === 'FULL') {
    content = (
      <>
        <Summary going={going} max={slot.maxParticipants} />
        <Button size="lg" disabled>
          Full
        </Button>
      </>
    )
  } else {
    content = (
      <>
        <Summary going={going} max={slot.maxParticipants} />
        <Button
          size="lg"
          className="min-w-36"
          loading={join.isPending}
          onClick={() =>
            join.mutate(slot.id, {
              onSuccess: () => toast("You're in. See you there!"),
              onError: toastError,
            })
          }
        >
          I'm in
        </Button>
      </>
    )
  }

  return (
    <>
      <div className="shrink-0 border-t border-line bg-ink/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">{content}</div>
      </div>

      <ConfirmDialog
        open={confirm === 'leave'}
        title="Leave this workout?"
        confirmLabel="Leave"
        destructive
        busy={leave.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          leave.mutate(slot.id, {
            onSuccess: () => {
              setConfirm(null)
              toast('You left the workout')
            },
            onError: toastError,
          })
        }
      >
        {firstName(slot.host.name)} will see one fewer person coming. You can join again while
        there's space.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'cancel'}
        title="Cancel this workout?"
        confirmLabel="Cancel workout"
        destructive
        busy={cancel.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          cancel.mutate(slot.id, {
            onSuccess: () => {
              setConfirm(null)
              toast('Workout cancelled')
              navigate('/', { replace: true })
            },
            onError: toastError,
          })
        }
      >
        Everyone who's going will see it as cancelled. This can't be undone.
      </ConfirmDialog>
    </>
  )
}

function Summary({ going, max }: { going: number; max: number | null }) {
  return (
    <p className="text-[13px] text-zinc-400">
      <span className="font-display text-xl font-bold text-white tabular">{going}</span>
      {max ? <span className="tabular"> / {max}</span> : null} going
    </p>
  )
}

function ShareButton({ slot }: { slot: SlotDetail }) {
  const share = async () => {
    const url = window.location.href
    const text = `${slot.title}: ${relativeDay(slot.date, toISODate(new Date()))} at ${slot.startTime}`
    try {
      if (navigator.share) {
        await navigator.share({ title: slot.title, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast('Link copied')
      }
    } catch {
      // The share sheet was dismissed.
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share workout"
      className="grid size-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/75 active:scale-95"
    >
      <Share className="size-[18px]" aria-hidden />
    </button>
  )
}

function WorkoutSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="relative h-60 animate-pulse bg-surface">
        <TopBar overlay />
      </div>
      <div className="space-y-3 px-4 pt-4">
        <div className="h-3 w-32 animate-pulse rounded bg-surface" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-surface" />
        <div className="h-20 animate-pulse rounded-xl bg-surface" />
      </div>
    </div>
  )
}
