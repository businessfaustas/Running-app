import { toISODate } from '@grouppace/shared'
import { create } from 'zustand'
import type { SportFilter } from '../features/slots/meta'

export type ViewMode = 'timeline' | 'map'

interface TimelineState {
  selectedDate: string
  sportFilter: SportFilter
  view: ViewMode
  selectedSlotId: string | null
  setSelectedDate: (date: string) => void
  setSportFilter: (filter: SportFilter) => void
  setView: (view: ViewMode) => void
  /** Selecting the already-selected slot clears the selection. */
  toggleSlot: (slotId: string | null) => void
}

export const useTimelineStore = create<TimelineState>()((set) => ({
  selectedDate: toISODate(new Date()),
  sportFilter: 'ALL',
  view: 'timeline',
  selectedSlotId: null,
  setSelectedDate: (selectedDate) => set({ selectedDate, selectedSlotId: null }),
  setSportFilter: (sportFilter) => set({ sportFilter }),
  setView: (view) => set({ view }),
  toggleSlot: (slotId) =>
    set((state) => ({ selectedSlotId: state.selectedSlotId === slotId ? null : slotId })),
}))
