import { addDays, toISODate, type Profile } from '@grouppace/shared'
import { ArrowUpRight, Bike, CalendarPlus, Footprints } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Avatar } from '../../components/Avatar'
import { EmptyState } from '../../components/EmptyState'
import { useUserSlots } from '../../data/hooks'
import { formatKm, isPast } from '../../lib/format'
import { SlotDayList } from '../slots/SlotDayList'

const PACE_LABELS: [keyof Profile['defaultPaces'], string][] = [
  ['running_easy', 'Easy run'],
  ['running_tempo', 'Tempo run'],
  ['cycling_avg', 'Road ride'],
  ['gravel_avg', 'Gravel'],
]

interface ProfileViewProps {
  profile: Profile
  isMe: boolean
  actions?: ReactNode
}

export function ProfileView({ profile, isMe, actions }: ProfileViewProps) {
  const slots = useUserSlots(profile.id)
  const today = toISODate(new Date())

  const { upcoming, hosted, joined, kmThisWeek } = useMemo(() => {
    const all = (slots.data ?? []).filter(({ slot }) => slot.status !== 'CANCELLED')
    const upcoming = all.filter(({ slot }) => !isPast(slot.date, slot.startTime, slot.endTime))
    const weekEnd = addDays(today, 6)
    return {
      upcoming,
      hosted: all.filter((s) => s.role === 'HOST').length,
      joined: all.filter((s) => s.role === 'PARTICIPANT').length,
      kmThisWeek: upcoming
        .filter(({ slot }) => slot.date <= weekEnd)
        .reduce((sum, { slot }) => sum + slot.distanceKm, 0),
    }
  }, [slots.data, today])

  const paces = PACE_LABELS.filter(([key]) => profile.defaultPaces[key])

  return (
    <div className="px-4 pb-10">
      <div className="flex items-center gap-4">
        <Avatar user={profile} size={84} />
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-[1.05] font-bold tracking-wide uppercase">
            {profile.name}
          </h1>
          {profile.sports.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {profile.sports.map((sport) => (
                <span
                  key={sport}
                  className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[12px] font-medium text-zinc-300 capitalize"
                >
                  {sport === 'running' ? (
                    <Footprints className="size-3" aria-hidden />
                  ) : (
                    <Bike className="size-3" aria-hidden />
                  )}
                  {sport}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-300">{profile.bio}</p>
      )}
      {profile.stravaId && (
        <a
          href={`https://www.strava.com/athletes/${encodeURIComponent(profile.stravaId)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#fc5200] hover:underline"
        >
          Strava profile
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      )}
      {actions && <div className="mt-5 flex gap-2">{actions}</div>}

      <dl className="mt-6 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface">
        <Stat label="Hosted" value={hosted} />
        <Stat label="Joined" value={joined} />
        <Stat label="Km this week" value={formatKm(Math.round(kmThisWeek * 10) / 10)} />
      </dl>

      {paces.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2.5 font-display text-[17px] font-bold tracking-wide uppercase">
            Usual paces
          </h2>
          <dl className="grid grid-cols-2 gap-2">
            {paces.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-line px-3.5 py-2.5">
                <dt className="text-[12px] text-zinc-500">{label}</dt>
                <dd className="font-display text-xl font-bold text-white tabular">
                  {profile.defaultPaces[key]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-7">
        <h2 className="mb-1 font-display text-[17px] font-bold tracking-wide uppercase">
          Coming up
        </h2>
        {slots.isPending ? (
          <div className="h-14 animate-pulse rounded-xl bg-surface" />
        ) : upcoming.length === 0 ? (
          <EmptyState Icon={CalendarPlus} title="Nothing planned">
            {isMe ? 'Join or post a workout and it shows up here.' : null}
          </EmptyState>
        ) : (
          <SlotDayList items={upcoming} />
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col-reverse px-3 py-3 text-center">
      <dt className="mt-1 text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="font-display text-[26px] leading-none font-bold text-white tabular">
        {value}
      </dd>
    </div>
  )
}
