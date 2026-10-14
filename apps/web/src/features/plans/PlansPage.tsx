import type { UserSlot } from '@pacemates/shared'
import clsx from 'clsx'
import { CalendarCheck2, CalendarPlus, Clock, MapPin } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { PageHeader } from '../../components/PageHeader'
import { useSession } from '../../data/auth'
import { useUserSlots } from '../../data/hooks'
import { countOf, formatKm, isPast, startsIn, WORDS } from '../../lib/format'
import { PHOTOS, photoFor } from '../../lib/photos'
import { useNow } from '../../lib/useNow'
import { SignedOutPrompt } from '../auth/RequireAuth'
import { SPORT_META } from '../slots/meta'
import { SlotDayList } from '../slots/SlotDayList'

type Tab = 'upcoming' | 'past'

export function PlansPage() {
  const session = useSession()
  return (
    <div className="flex h-full flex-col">
      <PageHeader eyebrow="Tavo savaitė" title="Planai" />
      {session ? (
        <Plans userId={session.userId} />
      ) : (
        <SignedOutPrompt
          Icon={CalendarCheck2}
          title="Visa savaitė vienoje vietoje"
          photo={PHOTOS.runCoast}
        >
          Prisijunk ir matysi treniruotes, kurias organizuoji ar į kurias eini.
        </SignedOutPrompt>
      )}
    </div>
  )
}

function Plans({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const slots = useUserSlots(userId)
  const { upcoming, past } = useMemo(() => {
    const all = slots.data ?? []
    const isDone = ({ slot }: UserSlot) => isPast(slot.date, slot.startTime, slot.endTime)
    return {
      upcoming: all.filter((s) => !isDone(s)),
      past: all.filter(isDone).reverse(),
    }
  }, [slots.data])

  const nextUp = upcoming.find(({ slot }) => slot.status !== 'CANCELLED')
  const list = tab === 'upcoming' ? upcoming.filter((item) => item !== nextUp) : past

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--nav-space)+16px)]">
      {slots.isError ? (
        <ErrorState error={slots.error} onRetry={() => slots.refetch()} />
      ) : slots.isPending ? (
        <div className="space-y-3 pt-3">
          <div className="h-56 animate-pulse rounded-[28px] bg-surface" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-[22px] bg-surface" />
          ))}
        </div>
      ) : (
        <>
          {nextUp && tab === 'upcoming' && <NextUp item={nextUp} />}

          <div role="tablist" className="mt-4 grid grid-cols-2 rounded-full bg-surface p-1">
            {(
              [
                ['upcoming', 'Artėjančios', upcoming.length],
                ['past', 'Įvykusios', past.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={clsx(
                  'flex h-10 items-center justify-center gap-2 rounded-full text-[14px] font-bold transition-colors',
                  tab === id ? 'bg-blue text-white' : 'text-slate-400 hover:text-white',
                )}
              >
                {label}
                <span className={clsx('tabular', tab === id ? 'text-volt' : 'text-slate-600')}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            tab === 'upcoming' && !nextUp ? (
              <EmptyState
                Icon={CalendarPlus}
                title="Kol kas nieko"
                action={<ButtonLink to="/">Rasti treniruotę</ButtonLink>}
              >
                Prisijunk prie grupės arba sukurk savo treniruotę – ji atsiras čia.
              </EmptyState>
            ) : tab === 'past' ? (
              <EmptyState Icon={CalendarCheck2} title="Dar nieko neįvyko">
                Čia rasi treniruotes, kuriose jau dalyvavai.
              </EmptyState>
            ) : (
              <p className="py-8 text-center text-[13px] text-slate-500">
                Daugiau planų nėra. Gal dar vieną?{' '}
                <Link to="/" className="font-bold text-volt">
                  Rasti
                </Link>
              </p>
            )
          ) : (
            <SlotDayList items={list} dimmed={tab === 'past'} stickyHeadings />
          )}
        </>
      )}
    </div>
  )
}

function NextUp({ item }: { item: UserSlot }) {
  const { slot, role } = item
  const now = useNow()
  const sport = SPORT_META[slot.sportType]
  return (
    <Link
      to={`/workouts/${slot.id}`}
      style={{ '--accent': sport.accent } as CSSProperties}
      className="relative mt-3 flex h-60 flex-col justify-end overflow-hidden rounded-[28px] p-5 transition active:scale-[0.99]"
    >
      <img
        src={photoFor(slot.sportType, slot.vibeTag)}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10" />
      <span className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-volt px-3 py-1 text-[12px] font-bold text-black">
        <Clock className="size-3.5" aria-hidden />
        {startsIn(slot.date, slot.startTime, now)}
      </span>
      <span className="glass absolute top-4 right-4 rounded-full px-3 py-1 text-[12px] font-bold text-white">
        {role === 'HOST' ? 'Organizuoji' : 'Dalyvauji'}
      </span>
      <span className="relative text-[12px] font-bold tracking-[0.14em] text-white/70 uppercase">
        Artimiausia
      </span>
      <span className="headline relative mt-1 text-[34px] text-white">{slot.title}</span>
      <span className="relative mt-2 flex items-center gap-1.5 truncate text-[13px] text-white/80">
        <MapPin className="size-3.5 shrink-0 text-(--accent)" aria-hidden />
        <span className="truncate">
          {slot.meetingPoint.name} · {formatKm(slot.distanceKm)} km ·{' '}
          {countOf(slot.participantCount, WORDS.person)}
        </span>
      </span>
    </Link>
  )
}
