import { minutesToTime, timeToMinutes, type SlotSummary, type UserSlot } from '@grouppace/shared'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { useNow } from '../../lib/useNow'
import { SlotCard } from '../slots/SlotCard'
import { layoutDay } from './layout'

export const HOUR_HEIGHT = 96
/** Tall enough for the card's rows; shorter workouts are drawn at this height. */
export const MIN_CARD_HEIGHT = 104
/** Used to size cards whose host didn't give an end time. */
const DEFAULT_DURATION_MIN = 60
const AXIS_WIDTH = 52
const PADDING_TOP = 12
const PADDING_BOTTOM = 40
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
}

/** Vertical 00:00–24:00 day grid with workouts placed at their start times. */
export function Timeline({ date, slots, isToday, isLoading, focusedSlotId, roles }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const now = useNow()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const [draft, setDraft] = useState<{ date: string; minute: number } | null>(null)
  const draftMinute = draft?.date === date ? draft.minute : null

  const placed = useMemo(() => {
    const items = new Map(
      slots.map((slot) => {
        const startMin = timeToMinutes(slot.startTime)
        const endMin = slot.endTime ? timeToMinutes(slot.endTime) : startMin + DEFAULT_DURATION_MIN
        return [slot.id, { id: slot.id, slot, startMin, endMin: Math.min(endMin, 24 * 60) }]
      }),
    )
    return layoutDay([...items.values()], {
      hourHeight: HOUR_HEIGHT,
      minHeight: MIN_CARD_HEIGHT,
    }).map((box) => ({ ...box, ...items.get(box.id)! }))
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
      {!isLoading && slots.length === 0 && <EmptyDay />}

      <div className="relative" style={{ height: DAY_HEIGHT + PADDING_TOP + PADDING_BOTTOM }}>
        <div
          className="absolute inset-x-0"
          style={{ top: PADDING_TOP, height: DAY_HEIGHT }}
          onClick={onGridClick}
        >
          <HourGrid />

          <ol
            aria-label="Workouts"
            className="pointer-events-none absolute inset-y-0 right-3"
            style={{ left: AXIS_WIDTH }}
          >
            {isLoading ? (
              <Skeletons />
            ) : (
              placed.map(({ slot, endMin, top, height, durationHeight, column, columns }) => (
                <li
                  key={slot.id}
                  className="pointer-events-auto absolute p-[3px] motion-safe:animate-rise"
                  style={{
                    top,
                    height,
                    left: `${(column / columns) * 100}%`,
                    width: `${100 / columns}%`,
                  }}
                >
                  <SlotCard
                    slot={slot}
                    focused={slot.id === focusedSlotId}
                    dimmed={isToday && endMin <= nowMinutes}
                    durationRatio={durationHeight / height}
                    role={roles.get(slot.id)}
                  />
                </li>
              ))
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
                className="flex size-full items-start gap-2 rounded-xl border border-dashed border-zinc-500 bg-white/[0.04] p-3 text-left text-[13px] font-semibold text-white transition hover:bg-white/[0.07]"
              >
                <Plus className="size-4 text-volt" aria-hidden />
                Post a workout at {minutesToTime(draftMinute)}
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
            className="absolute -translate-y-1/2 pr-2.5 text-right font-display text-[13px] font-semibold text-zinc-500 tabular"
            style={{ top: minutesToPx(hour * 60), width: AXIS_WIDTH }}
          >
            {minutesToTime(hour * 60)}
          </span>
          <span
            className="absolute right-0 h-px bg-line/70"
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
        <span className="rounded bg-volt px-1 py-px font-display text-[13px] font-bold text-black tabular">
          {minutesToTime(minutes)}
        </span>
      </span>
      <span
        className="absolute right-0 h-px -translate-y-1/2 bg-volt"
        style={{ left: AXIS_WIDTH }}
      />
    </div>
  )
}

function Skeletons() {
  const blocks = [
    { start: 6 * 60, column: 0, columns: 2 },
    { start: 6 * 60 + 30, column: 1, columns: 2 },
    { start: 10 * 60, column: 0, columns: 1 },
    { start: 12 * 60 + 30, column: 0, columns: 1 },
    { start: 17 * 60 + 30, column: 0, columns: 2 },
    { start: 18 * 60, column: 1, columns: 2 },
    { start: 20 * 60 + 30, column: 0, columns: 1 },
  ]
  return blocks.map(({ start, column, columns }) => (
    <li
      key={start}
      aria-hidden
      className="absolute p-[3px]"
      style={{
        top: minutesToPx(start),
        height: MIN_CARD_HEIGHT,
        left: `${(column / columns) * 100}%`,
        width: `${100 / columns}%`,
      }}
    >
      <div className="size-full animate-pulse rounded-xl bg-surface" />
    </li>
  ))
}

function EmptyDay() {
  return (
    <div className="pointer-events-none sticky top-5 z-30 h-0">
      <div className="mx-auto w-fit max-w-[calc(100%-2rem)] rounded-xl border border-line bg-raised px-4 py-3 text-center shadow-xl shadow-black/40">
        <p className="text-sm font-semibold text-white">Nothing planned yet</p>
        <p className="mt-0.5 text-[13px] text-zinc-400">
          Tap a time on the grid to post the first one.
        </p>
      </div>
    </div>
  )
}
