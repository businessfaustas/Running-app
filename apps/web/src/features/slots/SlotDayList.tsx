import { toISODate, type UserSlot } from '@pacemates/shared'
import clsx from 'clsx'
import { relativeDay } from '../../lib/format'
import { SlotRow } from './SlotRow'

interface SlotDayListProps {
  items: UserSlot[]
  dimmed?: boolean
  /** Keep each day's heading visible while its workouts scroll past. */
  stickyHeadings?: boolean
}

/** Workouts grouped under "Šiandien", "Rytoj", "Kt, spalio 15 d."… in the order given. */
export function SlotDayList({ items, dimmed = false, stickyHeadings = false }: SlotDayListProps) {
  const today = toISODate(new Date())
  const days = new Map<string, UserSlot[]>()
  for (const item of items) days.set(item.slot.date, [...(days.get(item.slot.date) ?? []), item])

  return [...days.entries()].map(([date, dayItems]) => (
    <section key={date}>
      <h3
        className={clsx(
          'pt-5 pb-2 text-[12px] font-bold tracking-[0.12em] text-slate-500 uppercase',
          stickyHeadings && 'sticky top-0 z-10 bg-ink',
        )}
      >
        {relativeDay(date, today)}
      </h3>
      <ul className="flex flex-col gap-2">
        {dayItems.map(({ slot, role }) => (
          <li key={slot.id}>
            <SlotRow slot={slot} role={role} dimmed={dimmed} />
          </li>
        ))}
      </ul>
    </section>
  ))
}
