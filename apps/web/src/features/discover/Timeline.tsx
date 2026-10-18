import { minutesToTime, timeToMinutes, type SlotSummary, type UserSlot } from '@pacemates/shared'
import clsx from 'clsx'
import { ChevronsRight, Layers, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { countOf, WORDS } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { SlotCard } from '../slots/SlotCard'
import { groupDay } from './layout'

export const HOUR_HEIGHT = 100
/** Tall enough for the card's rows; shorter workouts are drawn at this height. */
export const MIN_CARD_HEIGHT = 112
/** Workouts at the same time: a header row above cards of the usual height. */
const GROUP_HEIGHT = MIN_CARD_HEIGHT + 46
/** Used to size cards whose host didn't give an end time. */
const DEFAULT_DURATION_MIN = 60
const AXIS_WIDTH = 52
const PADDING_TOP = 12
const PADDING_BOTTOM = 24
const DAY_HEIGHT = 24 * HOUR_HEIGHT
/** Tapping empty space suggests a start time on this grid. */
const SNAP_MINUTES = 15

const minutesToPx = (minutes: number) => (minutes / 60) * HOUR_HEIGHT

interface TimelineProps {
  date: string
  slots: SlotSummary[]
  isToday: boolean
  isLoading: boolean
  focusedSlotId: string | null
  /** The signed-in athlete's role per workout id. */
  roles: Map<string, UserSlot['role']>
  /** "Kaune" – for the empty-day hint. */
  cityLocative: string
}

/** Vertical 00:00–24:00 day grid with workouts placed at their start times. */
export function Timeline({
  date,
  slots,
  isToday,
  isLoading,
  focusedSlotId,
  roles,
  cityLocative,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const now = useNow()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const [draft, setDraft] = useState<{ date: string; minute: number } | null>(null)
  const draftMinute = draft?.date === date ? draft.minute : null

  const blocks = useMemo(() => {
    const items = new Map(
      slots.map((slot) => {
        const startMin = timeToMinutes(slot.startTime)
        const endMin = slot.endTime ? timeToMinutes(slot.endTime) : startMin + DEFAULT_DURATION_MIN
        return [slot.id, { id: slot.id, slot, startMin, endMin: Math.min(endMin, 24 * 60) }]
      }),
    )
    return groupDay([...items.values()], {
      hourHeight: HOUR_HEIGHT,
      cardHeight: MIN_CARD_HEIGHT,
      groupHeight: GROUP_HEIGHT,
    }).map((block) => ({ ...block, items: block.ids.map((id) => items.get(id)!) }))
  }, [slots])

  // Scroll once per day shown (to "now" or the first workout), and again when a highlighted
  // workout appears in the data, e.g. one that was just posted.
  const scrolledForDate = useRef<string | null>(null)
  const scrolledToFocus = useRef<string | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollTo = (minutes: number) => {
      el.scrollTo({
        top: Math.max(0, minutesToPx(minutes)),
        behavior: scrolledForDate.current === null ? 'instant' : 'smooth',
      })
      scrolledForDate.current = date
    }

    const focused = slots.find((slot) => slot.id === focusedSlotId)
    if (focused && scrolledToFocus.current !== focused.id) {
      scrolledToFocus.current = focused.id
      scrollTo(timeToMinutes(focused.startTime) - 60)
      return
    }
    if (scrolledForDate.current === date) return
    if (isLoading && !isToday) return // the target depends on data we don't have yet

    const firstStart = Math.min(...slots.map((slot) => timeToMinutes(slot.startTime)))
    scrollTo(isToday ? nowMinutes - 60 : Number.isFinite(firstStart) ? firstStart - 30 : 7 * 60)
  }, [date, focusedSlotId, isLoading, isToday, nowMinutes, slots])

  const onGridClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('a,button')) return
    const rect = event.currentTarget.getBoundingClientRect()
    const minute = ((event.clientY - rect.top) / HOUR_HEIGHT) * 60
    const snapped = Math.floor(minute / SNAP_MINUTES) * SNAP_MINUTES
    const clamped = Math.min(Math.max(snapped, 0), 24 * 60 - 60)
    setDraft(draftMinute === clamped ? null : { date, minute: clamped })
  }

  return (
    <div
      ref={scrollRef}
      className="scrollbar-none relative h-full overflow-y-auto overscroll-contain"
      aria-busy={isLoading}
    >
      {!isLoading && slots.length === 0 && <EmptyDay cityLocative={cityLocative} />}

      <div
        className="relative"
        style={{
          height: `calc(${DAY_HEIGHT + PADDING_TOP + PADDING_BOTTOM}px + var(--nav-space))`,
        }}
      >
        <div
          className="absolute inset-x-0"
          style={{ top: PADDING_TOP, height: DAY_HEIGHT }}
          onClick={onGridClick}
        >
          <HourGrid />

          <ol
            aria-label="Treniruotės"
            className="pointer-events-none absolute inset-y-0 right-3"
            style={{ left: AXIS_WIDTH }}
          >
            {isLoading ? (
              <Skeletons />
            ) : (
              blocks.map((block) =>
                block.items.length === 1 ? (
                  <li
                    key={block.ids[0]}
                    className="pointer-events-auto absolute inset-x-0 p-[3px] motion-safe:animate-rise"
                    style={{ top: block.top, height: block.height }}
                  >
                    <SlotCard
                      slot={block.items[0]!.slot}
                      focused={block.ids[0] === focusedSlotId}
                      dimmed={isToday && block.endMin <= nowMinutes}
                      role={roles.get(block.ids[0]!)}
                    />
                  </li>
                ) : (
                  <li
                    key={block.ids.join()}
                    className="pointer-events-auto absolute inset-x-0 p-[3px] motion-safe:animate-rise"
                    style={{ top: block.top, height: block.height }}
                  >
                    <Options
                      items={block.items}
                      startMin={block.startMin}
                      endMin={block.endMin}
                      focusedSlotId={focusedSlotId}
                      nowMinutes={isToday ? nowMinutes : null}
                      roles={roles}
                    />
                  </li>
                ),
              )
            )}
          </ol>

          {draftMinute !== null && (
            <div
              className="absolute right-3 z-10 p-[3px] motion-safe:animate-fade"
              style={{ top: minutesToPx(draftMinute), height: HOUR_HEIGHT, left: AXIS_WIDTH }}
            >
              <button
                type="button"
                onClick={() =>
                  navigate(`/workouts/new?date=${date}&time=${minutesToTime(draftMinute)}`)
                }
                className="flex size-full items-start gap-2 rounded-[20px] border-2 border-dashed border-volt/60 bg-volt/[0.06] p-3 text-left text-[13px] font-bold text-white transition hover:bg-volt/10"
              >
                <span className="grid size-6 place-items-center rounded-full bg-volt text-black">
                  <Plus className="size-4" strokeWidth={3} aria-hidden />
                </span>
                <span className="pt-0.5">Sukurti treniruotę {minutesToTime(draftMinute)}</span>
              </button>
            </div>
          )}

          {isToday && <NowIndicator minutes={nowMinutes} />}
        </div>
      </div>
    </div>
  )
}

function HourGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 25 }, (_, hour) => (
        <div key={hour}>
          <span
            className="absolute -translate-y-1/2 pr-2.5 text-right font-display text-[14px] font-semibold text-slate-500 tabular"
            style={{ top: minutesToPx(hour * 60), width: AXIS_WIDTH }}
          >
            {minutesToTime(hour * 60)}
          </span>
          <span
            className="absolute right-0 h-px bg-white/[0.06]"
            style={{ top: minutesToPx(hour * 60), left: AXIS_WIDTH }}
          />
        </div>
      ))}
    </div>
  )
}

function NowIndicator({ minutes }: { minutes: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top: minutesToPx(minutes) }}
    >
      <span
        className="absolute flex -translate-y-1/2 justify-end pr-1"
        style={{ width: AXIS_WIDTH }}
      >
        <span className="rounded-full bg-volt px-1.5 py-px font-display text-[13px] font-bold text-black tabular shadow-[0_0_16px_rgb(212_255_63/0.5)]">
          {minutesToTime(minutes)}
        </span>
      </span>
      <span
        className="absolute right-0 h-0.5 -translate-y-1/2 bg-volt shadow-[0_0_10px_rgb(212_255_63/0.6)]"
        style={{ left: AXIS_WIDTH }}
      />
    </div>
  )
}

/**
 * Several workouts at about the same time, shown together so people can compare and pick:
 * two side by side, more in a row you swipe through.
 */
function Options({
  items,
  startMin,
  endMin,
  focusedSlotId,
  nowMinutes,
  roles,
}: {
  items: { slot: SlotSummary; endMin: number }[]
  startMin: number
  endMin: number
  focusedSlotId: string | null
  /** Set on today's timeline, to fade workouts that have finished. */
  nowMinutes: number | null
  roles: Map<string, UserSlot['role']>
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const swipe = items.length > 2

  // Bring a highlighted workout (a map pin, a new post) into view within the row.
  useEffect(() => {
    const row = rowRef.current
    const card = row?.querySelector<HTMLElement>(`[data-slot="${focusedSlotId}"]`)
    if (row && card && swipe) row.scrollTo({ left: card.offsetLeft - 6, behavior: 'smooth' })
  }, [focusedSlotId, swipe])

  return (
    <section
      aria-label={`${countOf(items.length, WORDS.option)} ${minutesToTime(startMin)}–${minutesToTime(endMin)}`}
      className="flex size-full flex-col rounded-[22px] border border-volt/25 bg-volt/[0.05] p-1.5"
    >
      <header className="flex items-center gap-2 px-1.5 pt-0.5 pb-1.5 text-[12px] font-bold">
        <span className="flex items-center gap-1.5 text-volt">
          <Layers className="size-3.5" aria-hidden />
          {countOf(items.length, WORDS.option)} – rinkis
        </span>
        <span className="font-display text-[13px] text-slate-400 tabular">
          {minutesToTime(startMin)}–{minutesToTime(endMin)}
        </span>
        {swipe && (
          <span className="ml-auto flex items-center gap-0.5 text-slate-400">
            Brauk
            <ChevronsRight className="size-3.5" aria-hidden />
          </span>
        )}
      </header>
      <div
        ref={rowRef}
        className={clsx(
          'min-h-0 flex-1 gap-1.5',
          swipe
            ? 'scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain'
            : 'grid grid-cols-2',
        )}
      >
        {items.map(({ slot, endMin: end }) => (
          <div
            key={slot.id}
            data-slot={slot.id}
            className={clsx('min-w-0', swipe && 'w-[46%] shrink-0 snap-start')}
          >
            <SlotCard
              slot={slot}
              focused={slot.id === focusedSlotId}
              dimmed={nowMinutes !== null && end <= nowMinutes}
              role={roles.get(slot.id)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function Skeletons() {
  const starts = [6 * 60, 10 * 60, 12 * 60 + 30, 17 * 60 + 30, 20 * 60 + 30]
  return starts.map((start) => (
    <li
      key={start}
      aria-hidden
      className="absolute inset-x-0 p-[3px]"
      style={{ top: minutesToPx(start), height: MIN_CARD_HEIGHT }}
    >
      <div className="size-full animate-pulse rounded-[20px] bg-surface" />
    </li>
  ))
}

function EmptyDay({ cityLocative }: { cityLocative: string }) {
  return (
    <div className="pointer-events-none sticky top-5 z-30 h-0">
      <div className="mx-auto w-fit max-w-[calc(100%-2rem)] rounded-[22px] border border-white/10 bg-raised/95 px-5 py-4 text-center shadow-2xl shadow-black/50 backdrop-blur">
        <p className="headline text-[22px]">Kol kas tuščia</p>
        <p className="mt-1 text-[13px] text-slate-400">
          {cityLocative} šią dieną treniruočių dar nėra. Bakstelk laiką juostoje ir pakviesk kitus.
        </p>
      </div>
    </div>
  )
}
