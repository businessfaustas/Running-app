import { describe, expect, it } from 'vitest'
import { layoutDay, type TimedItem } from './layout'

const opts = { hourHeight: 60, minHeight: 60 } // 1px per minute keeps the maths readable
const at = (id: string, start: string, end: string): TimedItem => {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  return { id, startMin: toMin(start), endMin: toMin(end) }
}
const byId = (items: ReturnType<typeof layoutDay>) =>
  Object.fromEntries(items.map((i) => [i.id, i]))

describe('layoutDay', () => {
  it('positions a lone item by start time and duration', () => {
    const [item] = layoutDay([at('a', '10:00', '11:30')], opts)
    expect(item).toMatchObject({ top: 600, height: 90, durationHeight: 90, column: 0, columns: 1 })
  })

  it('enforces the minimum card height but reports the real duration', () => {
    const [item] = layoutDay([at('a', '12:15', '12:45')], opts)
    expect(item).toMatchObject({ height: 60, durationHeight: 30 })
  })

  it('splits overlapping items into side-by-side columns', () => {
    const items = byId(
      layoutDay(
        [at('ride', '17:30', '20:00'), at('run', '18:00', '19:00'), at('reps', '18:30', '19:30')],
        opts,
      ),
    )
    expect(items.ride).toMatchObject({ column: 0, columns: 3 })
    expect(items.run).toMatchObject({ column: 1, columns: 3 })
    expect(items.reps).toMatchObject({ column: 2, columns: 3 })
  })

  it('reuses a column once the earlier card has ended', () => {
    const items = byId(
      layoutDay(
        [at('a', '06:00', '07:00'), at('long', '06:30', '09:30'), at('b', '07:15', '08:15')],
        opts,
      ),
    )
    expect(items.a).toMatchObject({ column: 0, columns: 2 })
    expect(items.long).toMatchObject({ column: 1, columns: 2 })
    expect(items.b).toMatchObject({ column: 0, columns: 2 })
  })

  it('treats short items drawn at min height as overlapping what follows', () => {
    // 10:00–10:20 is drawn 60px tall, so it visually reaches 11:00 and collides with 10:40.
    const items = byId(
      layoutDay([at('short', '10:00', '10:20'), at('next', '10:40', '11:40')], opts),
    )
    expect(items.short).toMatchObject({ column: 0, columns: 2 })
    expect(items.next).toMatchObject({ column: 1, columns: 2 })
  })

  it('keeps separate groups independent', () => {
    const items = byId(
      layoutDay(
        [at('a', '08:00', '09:00'), at('b', '08:30', '09:30'), at('c', '14:00', '15:00')],
        opts,
      ),
    )
    expect(items.a?.columns).toBe(2)
    expect(items.b?.columns).toBe(2)
    expect(items.c).toMatchObject({ column: 0, columns: 1 })
  })

  it('stacks back-to-back items in the same column', () => {
    const items = byId(layoutDay([at('a', '08:00', '09:00'), at('b', '09:00', '10:00')], opts))
    expect(items.a).toMatchObject({ column: 0, columns: 1 })
    expect(items.b).toMatchObject({ column: 0, columns: 1 })
  })
})
