import type { SlotSummary } from '@pacemates/shared'
import { create } from 'zustand'

export interface Celebration {
  kind: 'joined' | 'posted'
  /** The workout being celebrated – shown as a ticket. */
  slot: SlotSummary
}

export const useCelebration = create<{ current: Celebration | null }>()(() => ({ current: null }))

/** Full-screen "you're in" / "it's posted" moment. */
export const celebrate = (celebration: Celebration) =>
  useCelebration.setState({ current: celebration })
export const dismissCelebration = () => useCelebration.setState({ current: null })
