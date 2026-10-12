import { toISODate, type SlotSummary } from '@grouppace/shared'

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

/** Slots dated between `from` and `to` inclusive (`YYYY-MM-DD`). */
export async function fetchSlots(range: { from: string; to: string }): Promise<SlotSummary[]> {
  if (!API_URL) return fetchMockSlots(range)

  const res = await fetch(`${API_URL}/slots?${new URLSearchParams(range)}`)
  if (!res.ok) throw new Error(`Couldn't load workouts (HTTP ${res.status})`)
  return (await res.json()) as SlotSummary[]
}

async function fetchMockSlots(range: { from: string; to: string }): Promise<SlotSummary[]> {
  const { buildMockSlotSummaries } = await import('@grouppace/shared/mock')
  // A little latency so loading states are exercised during development.
  await new Promise((resolve) => setTimeout(resolve, 300))
  return buildMockSlotSummaries(toISODate(new Date())).filter(
    (slot) => slot.date >= range.from && slot.date <= range.to,
  )
}
