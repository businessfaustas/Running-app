import { create } from 'zustand'

export interface Celebration {
  kind: 'joined' | 'posted'
  slotId: string
  title: string
}

export const useCelebration = create<{ current: Celebration | null }>()(() => ({ current: null }))

/** Full-screen "you're in" / "it's posted" moment. */
export const celebrate = (celebration: Celebration) => useCelebration.setState({ current: celebration })
export const dismissCelebration = () => useCelebration.setState({ current: null })
