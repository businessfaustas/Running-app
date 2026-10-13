export interface TimedItem {
  id: string
  /** Minutes since 00:00. */
  startMin: number
  endMin: number
}

export interface PlacedItem {
  id: string
  /** Pixel offset from 00:00. */
  top: number
  /** Rendered height: never less than `minHeight` so cards stay legible. */
  height: number
  /** Height the real duration would occupy (may be shorter than `height`). */
  durationHeight: number
  /** Zero-based column within its overlap group, and the group's column count. */
  column: number
  columns: number
}

export interface LayoutOptions {
  hourHeight: number
  minHeight: number
}

/**
 * Calendar-style layout for one day. Items whose *rendered* boxes overlap form a group;
 * each item takes the first free column in its group and the group shares the width equally.
 * Overlap is judged on rendered height (not raw duration) so short workouts drawn at
 * `minHeight` never cover the card below them.
 */
export function layoutDay(
  items: TimedItem[],
  { hourHeight, minHeight }: LayoutOptions,
): PlacedItem[] {
  const pxPerMinute = hourHeight / 60
  const placed = items
    .map((item): PlacedItem => {
      const durationHeight = Math.max(0, item.endMin - item.startMin) * pxPerMinute
      return {
        id: item.id,
        top: item.startMin * pxPerMinute,
        height: Math.max(durationHeight, minHeight),
        durationHeight,
        column: 0,
        columns: 1,
      }
    })
    .sort((a, b) => a.top - b.top || b.height - a.height)

  let group: PlacedItem[] = []
  let columnBottoms: number[] = []
  let groupBottom = -Infinity

  const closeGroup = () => {
    for (const item of group) item.columns = columnBottoms.length
    group = []
    columnBottoms = []
  }

  for (const item of placed) {
    if (item.top >= groupBottom) {
      closeGroup()
      groupBottom = -Infinity
    }
    const bottom = item.top + item.height
    let column = columnBottoms.findIndex((columnBottom) => columnBottom <= item.top)
    if (column === -1) column = columnBottoms.push(bottom) - 1
    else columnBottoms[column] = bottom

    item.column = column
    group.push(item)
    groupBottom = Math.max(groupBottom, bottom)
  }
  closeGroup()

  return placed
}
