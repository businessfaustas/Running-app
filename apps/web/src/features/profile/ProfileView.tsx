import { cityById, type Profile } from '@pacemates/shared'
import { todayISO } from '../../lib/clock'
import {
  ArrowUpRight,
  Bike,
  CalendarPlus,
  Camera,
  ChevronRight,
  Footprints,
  MapPin,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { EmptyState } from '../../components/EmptyState'
import { useUserSlots } from '../../data/hooks'
import { formatKm, isPast } from '../../lib/format'
import { BadgeCard } from '../badges/BadgeCard'
import { BadgeSheet } from '../badges/BadgesPage'
import { computeBadges, showcase, type Badge } from '../badges/badges'
import { weekProgress } from '../inspire/progress'
import { SlotDayList } from '../slots/SlotDayList'

const PACE_LABELS: [keyof Profile['defaultPaces'], string][] = [
  ['running_easy', 'Lengvas bėgimas'],
  ['running_tempo', 'Tempinis bėgimas'],
  ['cycling_avg', 'Plentas'],
  ['gravel_avg', 'Žvyrkelis'],
]

interface ProfileViewProps {
  profile: Profile
  isMe: boolean
  /** Buttons over the top of the blue header (back, edit…). */
  header?: ReactNode
}

export function ProfileView({ profile, isMe, header }: ProfileViewProps) {
  const slots = useUserSlots(profile.id)
  const today = todayISO()

  const { upcoming, hosted, joined, week, badges } = useMemo(() => {
    const items = slots.data ?? []
    const all = items.filter(({ slot }) => slot.status !== 'CANCELLED')
    return {
      upcoming: all.filter(({ slot }) => !isPast(slot.date, slot.startTime, slot.endTime)),
      hosted: all.filter((s) => s.role === 'HOST').length,
      joined: all.filter((s) => s.role === 'PARTICIPANT').length,
      week: weekProgress(items, today),
      badges: computeBadges(items),
    }
  }, [slots.data, today])

  const paces = PACE_LABELS.filter(([key]) => profile.defaultPaces[key])
  const earned = badges.filter((b) => b.earned)
  const shownBadges = showcase(badges, 8)
  const [openBadge, setOpenBadge] = useState<Badge | null>(null)

  return (
    <div className="pb-[calc(var(--nav-space)+16px)]">
      <div className="relative overflow-hidden rounded-b-[32px] bg-blue px-5 pt-[calc(env(safe-area-inset-top)+72px)] pb-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl"
        />
        {header}
        <div className="relative flex items-end gap-4">
          {isMe ? (
            <Link
              to="/profile/edit"
              aria-label="Keisti profilio nuotrauką"
              className="relative shrink-0 rounded-full transition active:scale-95"
            >
              <Avatar user={profile} size={96} className="ring-4 ring-white/25" />
              <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full bg-volt text-black ring-4 ring-blue">
                <Camera className="size-4" aria-hidden />
              </span>
            </Link>
          ) : (
            <Avatar user={profile} size={96} className="ring-4 ring-white/25" />
          )}
          <div className="min-w-0 pb-1">
            <h1 className="headline text-[30px] text-white">{profile.name}</h1>
            {(profile.sports.length > 0 || profile.city) && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {profile.city && (
                  <span className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white">
                    <MapPin className="size-3.5" aria-hidden />
                    {cityById(profile.city).name}
                  </span>
                )}
                {profile.sports.map((sport) => (
                  <span
                    key={sport}
                    className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white"
                  >
                    {sport === 'running' ? (
                      <Footprints className="size-3.5" aria-hidden />
                    ) : (
                      <Bike className="size-3.5" aria-hidden />
                    )}
                    {sport === 'running' ? 'Bėgimas' : 'Dviratis'}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
        {profile.bio && (
          <p className="relative mt-4 text-[15px] leading-relaxed text-white/85">{profile.bio}</p>
        )}
        {profile.stravaId && (
          <a
            href={`https://www.strava.com/athletes/${encodeURIComponent(profile.stravaId)}`}
            target="_blank"
            rel="noreferrer"
            className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-[#fc5200] px-3 py-1 text-[12px] font-bold text-white"
          >
            Strava profilis
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        )}
      </div>

      <div className="px-5">
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Organizavo" value={hosted} />
          <Stat label="Dalyvavo" value={joined} />
          <Stat label="Km šią sav." value={formatKm(week.km)} accent />
        </dl>

        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="headline text-[21px]">Ženkliukai</h2>
            {isMe ? (
              <Link to="/badges" className="flex items-center text-[13px] font-bold text-volt">
                {earned.length} iš {badges.length}
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className="text-[13px] font-bold text-slate-400">
                {earned.length} iš {badges.length}
              </span>
            )}
          </div>
          <div className="scrollbar-none -mx-5 flex gap-2.5 overflow-x-auto px-5 pt-1">
            {shownBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} onOpen={setOpenBadge} compact />
            ))}
          </div>
          <BadgeSheet badge={openBadge} onClose={() => setOpenBadge(null)} />
        </section>

        {paces.length > 0 && (
          <section className="mt-7">
            <h2 className="headline mb-3 text-[24px]">Įprasti tempai</h2>
            <dl className="grid grid-cols-2 gap-2">
              {paces.map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-[20px] border border-white/[0.06] bg-surface px-5 py-3"
                >
                  <dt className="text-[12px] font-semibold text-slate-500">{label}</dt>
                  <dd className="mt-0.5 font-display text-[24px] leading-tight font-bold text-white tabular">
                    {profile.defaultPaces[key]}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-7">
          {/* Others only see what this person hosts – never where they've signed up to be. */}
          <h2 className="headline text-[21px]">
            {isMe ? 'Artimiausios treniruotės' : 'Organizuoja'}
          </h2>
          {slots.isPending ? (
            <div className="mt-3 h-20 animate-pulse rounded-[22px] bg-surface" />
          ) : upcoming.length === 0 ? (
            <EmptyState Icon={CalendarPlus} title="Kol kas nieko">
              {isMe
                ? 'Prisijunk prie treniruotės arba sukurk savo – ji atsiras čia.'
                : 'Artimiausiu metu treniruočių neorganizuoja.'}
            </EmptyState>
          ) : (
            <SlotDayList items={upcoming} />
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number | string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col-reverse rounded-[20px] border border-white/[0.06] bg-surface px-3 py-3.5 text-center">
      <dt className="mt-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
        {label}
      </dt>
      <dd
        className={
          accent
            ? 'font-display text-[32px] leading-none font-bold text-volt tabular'
            : 'font-display text-[32px] leading-none font-bold text-white tabular'
        }
      >
        {value}
      </dd>
    </div>
  )
}
