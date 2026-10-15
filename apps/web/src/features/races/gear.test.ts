import type { Race } from '@pacemates/shared'
import { describe, expect, it } from 'vitest'
import { fuelingPath, gearFor } from './gear'

const base: Race = {
  slug: 'test-race',
  name: 'Testas',
  date: null,
  typicalMonth: 5,
  city: 'Vilnius',
  region: 'Vilniaus apskr.',
  start: { lat: 54.68, lng: 25.28 },
  type: 'ROAD',
  distances: [42.195, 21.0975, 10],
  surface: ['asphalt', 'cobbles'],
  elevationGainM: null,
  website: null,
  description: '',
  tips: [],
}

const ids = (race: Race, km: number) => gearFor(race, km).flatMap((g) => g.items.map((i) => i.id))

describe('gear checklist', () => {
  it('suits a spring road marathon', () => {
    const list = ids(base, 42.195)
    expect(list).toContain('road-shoes')
    expect(list).toContain('cobbles')
    expect(list).toContain('nipple')
    expect(list).not.toContain('trail-shoes')
    expect(list).not.toContain('lamp')
  })

  it('adds gaiters and a wind jacket for sand dunes on the coast', () => {
    const spit: Race = { ...base, type: 'TRAIL', surface: ['sand', 'dunes', 'forest', 'coast'] }
    const list = ids(spit, 25)
    expect(list).toEqual(expect.arrayContaining(['trail-shoes', 'gaiters', 'wind', 'vest', 'cup']))
  })

  it('asks for mandatory-style kit at ultras and warm layers in winter', () => {
    const ultra: Race = { ...base, type: 'ULTRA', typicalMonth: 12, surface: ['forest', 'night'] }
    const list = ids(ultra, 60)
    expect(list).toEqual(expect.arrayContaining(['lamp', 'blanket', 'rain', 'gloves', 'spikes']))
  })

  it('packs a helmet and spares for cycling', () => {
    const ride: Race = { ...base, type: 'CYCLING', surface: ['gravel'] }
    expect(ids(ride, 100)).toEqual(expect.arrayContaining(['helmet', 'spare', 'tyres', 'bottles']))
  })
})

describe('fuelling link', () => {
  it('prefills distance, climbing for that course and the usual temperature', () => {
    const path = fuelingPath(
      { ...base, type: 'TRAIL', distances: [40, 20], elevationGainM: 800, typicalMonth: 7 },
      20,
    )
    const params = new URLSearchParams(path!.split('?')[1])
    expect(params.get('distance')).toBe('20')
    expect(params.get('elevation')).toBe('400')
    expect(params.get('temp')).toBe('23')
  })

  it('is only offered for running races', () => {
    expect(fuelingPath({ ...base, type: 'CYCLING' }, 100)).toBeNull()
  })
})
