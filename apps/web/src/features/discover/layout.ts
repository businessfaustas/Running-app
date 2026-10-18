export interface TimedItem {
  id: string
  /** Minutes since 00:00. */
  startMin: number
  endMin: number
}

/** One thing drawn on the day: a single workout, or several shown together as options. */
export interface DayBlock {
  /** Workouts in the block, by start time. */
  ids: string[]
  startMin: number
  /** Latest finish among them. */
  endMin: number
  /** Pixel offset from 00:00. */
  top: number
  height: number
}

export interface GroupOptions {
  hourHeight: number
  /** A single card is never shorter than this, so it stays legible. */
  cardHeight: number
  /** Height of a block of workouts shown together (a header and a row of cards). */
  groupHeight: number
}

/**
 * Places a day's workouts on the timeline. Each workout gets a full-width card at its start
 * time, at least `cardHeight` tall (longer ones stretch with their duration). Workouts whose
 * cards would overlap – the same start time, or close enough to collide – are gathered into
 * one block and shown side by side as options to choose from, instead of being squeezed into
 * thin columns. Merging repeats until nothing collides, because a block can reach further
 * down than the cards it replaced.
 */
export function groupDay(
  items: TimedItem[],
  { hourHeight, cardHeight, groupHeight }: GroupOptions,
): DayBlock[] {
  const pxPerMinute = hourHeight / 60
  const heightOf = (block: Omit<DayBlock, 'top' | 'height'>) =>
    block.ids.length > 1
      ? groupHeight
      : Math.max((block.endMin - block.startMin) * pxPerMinute, cardHeight)

  let blocks = [...items]
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.id.localeCompare(b.id))
    .map((item) => ({ ids: [item.id], startMin: item.startMin, endMin: item.endMin }))

  for (;;) {
    const merged: typeof blocks = []
    for (const block of blocks) {
      const previous = merged.at(-1)
      const previousBottom = previous
        ? previous.startMin * pxPerMinute + heightOf(previous)
        : -Infinity
      if (previous && block.startMin * pxPerMinute < previousBottom) {
        previous.ids.push(...block.ids)
        previous.endMin = Math.max(previous.endMin, block.endMin)
      } else {
        merged.push({ ...block, ids: [...block.ids] })
      }
    }
    const settled = merged.length === blocks.length
    blocks = merged
    if (settled) break
  }

  return blocks.map((block) => ({
    ...block,
    top: block.startMin * pxPerMinute,
    height: heightOf(block),
  }))
}
