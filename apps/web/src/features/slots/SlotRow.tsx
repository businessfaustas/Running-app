import type { SlotSummary, UserSlot } from '@grouppace/shared'
import clsx from 'clsx'
import { Link } from 'react-router'
import { formatKm, shortDuration } from '../../lib/format'
import { SPORT_META } from './meta'

interface SlotRowProps {
  slot: SlotSummary
  role?: UserSlot['role']
  dimmed?: boolean
}

/** A workout as a list row: big start time, title, and what kind of session it is. */
export function SlotRow({ slot, role, dimmed = false }: SlotRowProps) {
  const sport = SPORT_META[slot.sportType]
  const cancelled = slot.status === 'CANCELLED'
  return (
    <Link
      to={`/workouts/${slot.id}`}
      className={clsx(
        'flex items-center gap-3.5 py-3 transition-opacity hover:opacity-90',
        (dimmed || cancelled) && 'opacity-50',
      )}
    >
      <div className="w-13 shrink-0 text-right">
        <p className="font-display text-[22px] leading-none font-bold text-white tabular">
          {slot.startTime}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          {shortDuration(slot.startTime, slot.endTime) ?? ''}
        </p>
      </div>
      <span
        aria-hidden
        className="h-10 w-[3px] shrink-0 rounded-full"
        style={{ background: sport.accent }}
      />
      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'truncate text-[15px] font-semibold text-white',
            cancelled && 'line-through',
          )}
        >
          {slot.title}
        </p>
        <p className="truncate text-[13px] text-zinc-400">
          {sport.label} · {formatKm(slot.distanceKm)} km · {slot.meetingPoint.name}
        </p>
      </div>
      {cancelled ? (
        <span className="shrink-0 text-[12px] font-semibold text-blaze">Cancelled</span>
      ) : role ? (
        <span
          className={clsx(
            'shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
            role === 'HOST' ? 'bg-volt/15 text-volt' : 'bg-white/10 text-zinc-200',
          )}
        >
          {role === 'HOST' ? 'Hosting' : 'Going'}
        </span>
      ) : (
        <span className="shrink-0 text-[12.5px] text-zinc-500 tabular">
          {slot.participantCount}
          {slot.maxParticipants ? `/${slot.maxParticipants}` : ''}
        </span>
      )}
    </Link>
  )
}
