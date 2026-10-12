import { minutesToTime, timeToMinutes, type SlotSummary } from '@grouppace/shared'
import { useEffect, useMemo, useRef } from 'react'
import { useNow } from '../../lib/useNow'
import { SlotCard } from '../slots/SlotCard'
import { layoutDay } from './layout'

export const HOUR_HEIGHT = 96
/** Tall enough for the card's three rows; shorter workouts are drawn at this height. */
export const MIN_CARD_HEIGHT = 104
/** Used to size cards whose host didn't give an end time. */
const DEFAULT_DURATION_MIN = 60
const AXIS_WIDTH = 56
const PADDING_TOP = 12
const PADDING_BOTTOM = 32
const DAY_HEIGHT = 24 * HOUR_HEIGHT

const minutesToPx = (minutes: number) => (minutes / 60) * HOUR_HEIGHT

interface TimelineProps {
  date: string
  slots: SlotSummary[]
  isToday: boolean
  isLoading: boolean
  selectedSlotId: string | null
  onSelectSlot: (slotId: string) => void
}

/** Vertical 00:00–24:00 day grid with workouts placed at their start times. */
export function Timeline({
  date,
  slots,
  isToday,
  isLoading,
  selectedSlotId,
  onSelectSlot,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = useNow()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

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

  // Scroll once per day shown: to the selected workout, to "now", or to the first workout.
  const scrolledForDate = useRef<string | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el || scrolledForDate.current === date) return
    if (isLoading && !isToday) return // the target depends on data we don't have yet

    const selected = slots.find((slot) => slot.id === selectedSlotId)
    const firstStart = Math.min(...slots.map((slot) => timeToMinutes(slot.startTime)))
    const targetMinutes = selected
      ? timeToMinutes(selected.startTime) - 45
      : isToday
        ? nowMinutes - 60
        : Number.isFinite(firstStart)
          ? firstStart - 30
          : 6 * 60

    el.scrollTo({
      top: Math.max(0, minutesToPx(targetMinutes)),
      behavior: scrolledForDate.current === null ? 'instant' : 'smooth',
    })
    scrolledForDate.current = date
  }, [date, isLoading, isToday, nowMinutes, selectedSlotId, slots])

  return (
    <div
      ref={scrollRef}
      className="scrollbar-none relative h-full overflow-y-auto overscroll-contain"
      aria-busy={isLoading}
    >
      {!isLoading && slots.length === 0 && <EmptyDay />}

      <div className="relative" style={{ height: DAY_HEIGHT + PADDING_TOP + PADDING_BOTTOM }}>
        <div className="absolute inset-x-0" style={{ top: PADDING_TOP, height: DAY_HEIGHT }}>
          <HourGrid />

          <ol
            aria-label="Workouts"
            className="absolute inset-y-0 right-3"
            style={{ left: AXIS_WIDTH }}
          >
            {isLoading ? (
              <Skeletons />
            ) : (
              placed.map(({ slot, endMin, top, height, durationHeight, column, columns }) => (
                <li
                  key={slot.id}
                  className="absolute p-0.5 motion-safe:animate-card-in"
                  style={{
                    top,
                    height,
                    left: `${(column / columns) * 100}%`,
                    width: `${100 / columns}%`,
                  }}
                >
                  <SlotCard
                    slot={slot}
                    selected={slot.id === selectedSlotId}
                    dimmed={isToday && endMin <= nowMinutes}
                    durationRatio={durationHeight / height}
                    onSelect={onSelectSlot}
                  />
                </li>
              ))
            )}
          </ol>

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
            className="absolute -translate-y-1/2 pr-3 text-right text-[11px] font-medium text-slate-500 tabular-nums"
            style={{ top: minutesToPx(hour * 60), width: AXIS_WIDTH }}
          >
            {minutesToTime(hour * 60)}
          </span>
          <span
            className="absolute right-0 h-px bg-slate-800/80"
            style={{ top: minutesToPx(hour * 60), left: AXIS_WIDTH }}
          />
          {hour < 24 && (
            <span
              className="absolute right-0 border-t border-dashed border-slate-800/50"
              style={{ top: minutesToPx(hour * 60 + 30), left: AXIS_WIDTH }}
            />
          )}
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
        className="absolute flex -translate-y-1/2 justify-end pr-1.5"
        style={{ width: AXIS_WIDTH }}
      >
        <span className="rounded-full bg-volt px-1.5 py-0.5 text-[10px] font-bold text-slate-950 tabular-nums shadow-[0_0_12px_rgb(204_255_0/0.5)]">
          {minutesToTime(minutes)}
        </span>
      </span>
      <span
        className="absolute right-0 h-0.5 -translate-y-1/2 bg-volt shadow-[0_0_8px_rgb(204_255_0/0.6)]"
        style={{ left: AXIS_WIDTH }}
      />
      <span
        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt"
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
      className="absolute p-0.5"
      style={{
        top: minutesToPx(start),
        height: MIN_CARD_HEIGHT,
        left: `${(column / columns) * 100}%`,
        width: `${100 / columns}%`,
      }}
    >
      <div className="size-full animate-pulse rounded-2xl border border-white/5 bg-slate-900" />
    </li>
  ))
}

function EmptyDay() {
  return (
    <div className="pointer-events-none sticky top-6 z-30 h-0">
      <div className="mx-auto w-fit max-w-[calc(100%-2rem)] rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-3 text-center shadow-xl shadow-black/40 backdrop-blur">
        <p className="text-sm font-semibold text-white">No beacons yet</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Nothing planned for this day. Try another day or sport.
        </p>
      </div>
    </div>
  )
}
