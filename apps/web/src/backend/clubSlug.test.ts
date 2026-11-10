import { describe, expect, it } from 'vitest'
import { newClubSlug } from './clubSlug'

describe('newClubSlug', () => {
  it('spells Lithuanian names in plain letters, with a random ending', () => {
    expect(newClubSlug('Bėgimo klubas „Vėjas“', () => 1_234_567)).toBe('begimo-klubas-vejas-qglj')
    expect(newClubSlug('Šiaulių ŽYGEIVIAI!!', () => 0)).toBe('siauliu-zygeiviai-0000')
  })

  it('never ends up empty or too long', () => {
    expect(newClubSlug('„“!!', () => 5)).toBe('klubas-0005')
    expect(newClubSlug('a'.repeat(200), () => 5).length).toBeLessThanOrEqual(65)
  })
})
