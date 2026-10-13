import { toISODate, type UserSlot } from '@grouppace/shared'
import clsx from 'clsx'
import { relativeDay } from '../../lib/format'
import { SlotRow } from './SlotRow'

interface SlotDayListProps {
  items: UserSlot[]
  dimmed?: boolean
  /** Keep each day's heading visible while its workouts scroll past. */
  stickyHeadings?: boolean
}

/** Workouts grouped under "Today", "Tomorrow", "Thu 15 Oct"… in the order given. */
export function SlotDayList({ items, dimmed = false, stickyHeadings = false }: SlotDayListProps) {
  const today = toISODate(new Date())
  const days = new Map<string, UserSlot[]>()
  for (const item of items) days.set(item.slot.date, [...(days.get(item.slot.date) ?? []), item])

  return [...days.entries()].map(([date, dayItems]) => (
    <section key={date}>
      <h3
        className={clsx(
          'pt-5 pb-1 text-[13px] font-semibold text-zinc-400',
          stickyHeadings && 'sticky top-0 z-10 bg-ink',
        )}
      >
        {relativeDay(date, today)}
      </h3>
      <ul className="divide-y divide-line">
        {dayItems.map(({ slot, role }) => (
          <li key={slot.id}>
            <SlotRow slot={slot} role={role} dimmed={dimmed} />
          </li>
        ))}
      </ul>
    </section>
  ))
}
