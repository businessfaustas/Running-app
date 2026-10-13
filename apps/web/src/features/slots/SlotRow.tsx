import type { SlotSummary, UserSlot } from '@pacemates/shared'
import clsx from 'clsx'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { formatKm, shortDuration } from '../../lib/format'
import { SPORT_META } from './meta'

interface SlotRowProps {
  slot: SlotSummary
  role?: UserSlot['role']
  dimmed?: boolean
}

/** A workout as a list card: start time on a sport-coloured tile, title, and details. */
export function SlotRow({ slot, role, dimmed = false }: SlotRowProps) {
  const sport = SPORT_META[slot.sportType]
  const cancelled = slot.status === 'CANCELLED'
  return (
    <Link
      to={`/workouts/${slot.id}`}
      style={{ '--accent': sport.accent } as CSSProperties}
      className={clsx(
        'flex items-center gap-3 rounded-[22px] border border-white/[0.06] bg-surface p-2.5 pr-3.5 transition active:scale-[0.99]',
        (dimmed || cancelled) && 'opacity-55',
      )}
    >
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[18px] bg-(--accent) text-black">
        <p className="font-display text-[21px] leading-none font-bold italic tabular">
          {slot.startTime}
        </p>
        <p className="mt-1 text-[10.5px] font-bold opacity-70">
          {shortDuration(slot.startTime, slot.endTime) ?? ''}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'truncate text-[15px] font-bold text-white',
            cancelled && 'line-through decoration-slate-500',
          )}
        >
          {slot.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-slate-400">
          <sport.Icon className="size-3.5 shrink-0 text-(--accent)" aria-hidden />
          <span className="truncate">
            {formatKm(slot.distanceKm)} km · {slot.meetingPoint.name}
          </span>
        </p>
      </div>
      {cancelled ? (
        <span className="shrink-0 text-[12px] font-bold text-blaze">Atšaukta</span>
      ) : role ? (
        <span
          className={clsx(
            'shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold',
            role === 'HOST' ? 'bg-volt text-black' : 'bg-white/10 text-white',
          )}
        >
          {role === 'HOST' ? 'Organizuoji' : 'Dalyvauji'}
        </span>
      ) : (
        <span className="shrink-0 text-[13px] font-bold text-slate-400 tabular">
          {slot.participantCount}
          {slot.maxParticipants ? `/${slot.maxParticipants}` : ''}
        </span>
      )}
    </Link>
  )
}
