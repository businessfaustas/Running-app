import { describe, expect, it } from 'vitest'
import { groupDay, type TimedItem } from './layout'

// 1px per minute keeps the maths readable.
const opts = { hourHeight: 60, cardHeight: 60, groupHeight: 90 }
const at = (id: string, start: string, end: string): TimedItem => {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  return { id, startMin: toMin(start), endMin: toMin(end) }
}

describe('groupDay', () => {
  it('gives a lone workout a card at its start time, as tall as its duration', () => {
    expect(groupDay([at('a', '10:00', '11:30')], opts)).toEqual([
      { ids: ['a'], startMin: 600, endMin: 690, top: 600, height: 90 },
    ])
  })

  it('keeps short workouts legible', () => {
    const [block] = groupDay([at('a', '12:15', '12:45')], opts)
    expect(block!.height).toBe(60)
  })

  it('gathers workouts at the same time into one block of options', () => {
    const blocks = groupDay(
      [at('run', '18:00', '19:00'), at('tempo', '18:00', '18:50'), at('easy', '18:10', '18:50')],
      opts,
    )
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      ids: ['run', 'tempo', 'easy'],
      startMin: 18 * 60,
      endMin: 19 * 60,
      height: 90,
    })
  })

  it('keeps workouts that don’t collide apart', () => {
    const blocks = groupDay([at('a', '08:00', '09:00'), at('b', '09:00', '10:00')], opts)
    expect(blocks.map((b) => b.ids)).toEqual([['a'], ['b']])
  })

  it('pulls in a workout that the taller block now reaches', () => {
    // a+b form a 90px block (to 07:30); c at 07:15 would sit under it.
    const blocks = groupDay(
      [at('a', '06:00', '06:30'), at('b', '06:10', '06:40'), at('c', '07:15', '07:45')],
      opts,
    )
    expect(blocks.map((b) => b.ids)).toEqual([['a', 'b', 'c']])
  })

  it('lets a long ride swallow workouts that start during it', () => {
    const blocks = groupDay(
      [at('ride', '17:30', '20:00'), at('run', '18:00', '19:00'), at('late', '21:00', '22:00')],
      opts,
    )
    expect(blocks.map((b) => b.ids)).toEqual([['ride', 'run'], ['late']])
    expect(blocks[0]).toMatchObject({ endMin: 20 * 60, height: 90 })
  })

  it('orders options by start time, longest first on ties', () => {
    const [block] = groupDay(
      [at('short', '07:00', '07:30'), at('long', '07:00', '09:00'), at('later', '07:20', '08:00')],
      opts,
    )
    expect(block!.ids).toEqual(['long', 'short', 'later'])
  })
})
