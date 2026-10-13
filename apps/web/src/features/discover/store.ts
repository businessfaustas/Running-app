import { toISODate } from '@pacemates/shared'
import { create } from 'zustand'
import type { SportFilter } from '../slots/meta'

export type DiscoverView = 'timeline' | 'map'

interface DiscoverState {
  selectedDate: string
  sportFilter: SportFilter
  view: DiscoverView
  /** Highlighted workout: a map pin's preview, or one that was just posted. */
  focusedSlotId: string | null
  setSelectedDate: (date: string) => void
  setSportFilter: (filter: SportFilter) => void
  setView: (view: DiscoverView) => void
  focusSlot: (slotId: string | null) => void
  /** Jump to a workout's day and highlight it on the timeline. */
  showSlot: (slotId: string, date: string) => void
}

export const useDiscoverStore = create<DiscoverState>()((set) => ({
  selectedDate: toISODate(new Date()),
  sportFilter: 'ALL',
  view: 'timeline',
  focusedSlotId: null,
  setSelectedDate: (selectedDate) => set({ selectedDate, focusedSlotId: null }),
  setSportFilter: (sportFilter) => set({ sportFilter }),
  setView: (view) => set({ view }),
  focusSlot: (focusedSlotId) => set({ focusedSlotId }),
  showSlot: (focusedSlotId, selectedDate) =>
    set({ focusedSlotId, selectedDate, view: 'timeline', sportFilter: 'ALL' }),
}))
