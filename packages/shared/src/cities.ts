/** A Lithuanian town people can pick as "where I train". */
export interface City {
  /** Stable id, stored on profiles – never rename one. */
  id: string
  name: string
  /** "Vilniuje" – for sentences like "Treniruotės Vilniuje". */
  locative: string
  lat: number
  lng: number
  /** Workouts within this distance of the centre count as this town's. */
  radiusKm: number
}

export const CITIES: City[] = [
  {
    id: 'vilnius',
    name: 'Vilnius',
    locative: 'Vilniuje',
    lat: 54.6872,
    lng: 25.2797,
    radiusKm: 22,
  },
  { id: 'kaunas', name: 'Kaunas', locative: 'Kaune', lat: 54.8985, lng: 23.9036, radiusKm: 18 },
  {
    id: 'klaipeda',
    name: 'Klaipėda',
    locative: 'Klaipėdoje',
    lat: 55.7033,
    lng: 21.1443,
    radiusKm: 18,
  },
  {
    id: 'siauliai',
    name: 'Šiauliai',
    locative: 'Šiauliuose',
    lat: 55.9349,
    lng: 23.3137,
    radiusKm: 14,
  },
  {
    id: 'panevezys',
    name: 'Panevėžys',
    locative: 'Panevėžyje',
    lat: 55.7348,
    lng: 24.3575,
    radiusKm: 14,
  },
  { id: 'alytus', name: 'Alytus', locative: 'Alytuje', lat: 54.3963, lng: 24.0459, radiusKm: 12 },
  {
    id: 'marijampole',
    name: 'Marijampolė',
    locative: 'Marijampolėje',
    lat: 54.5593,
    lng: 23.3541,
    radiusKm: 12,
  },
  {
    id: 'mazeikiai',
    name: 'Mažeikiai',
    locative: 'Mažeikiuose',
    lat: 56.3092,
    lng: 22.3415,
    radiusKm: 12,
  },
  { id: 'jonava', name: 'Jonava', locative: 'Jonavoje', lat: 55.0727, lng: 24.2793, radiusKm: 10 },
  { id: 'utena', name: 'Utena', locative: 'Utenoje', lat: 55.4977, lng: 25.5992, radiusKm: 12 },
  {
    id: 'kedainiai',
    name: 'Kėdainiai',
    locative: 'Kėdainiuose',
    lat: 55.2883,
    lng: 23.9748,
    radiusKm: 10,
  },
  {
    id: 'telsiai',
    name: 'Telšiai',
    locative: 'Telšiuose',
    lat: 55.9814,
    lng: 22.2472,
    radiusKm: 12,
  },
  {
    id: 'taurage',
    name: 'Tauragė',
    locative: 'Tauragėje',
    lat: 55.2522,
    lng: 22.2897,
    radiusKm: 10,
  },
  {
    id: 'ukmerge',
    name: 'Ukmergė',
    locative: 'Ukmergėje',
    lat: 55.2462,
    lng: 24.7598,
    radiusKm: 10,
  },
  {
    id: 'visaginas',
    name: 'Visaginas',
    locative: 'Visagine',
    lat: 55.598,
    lng: 26.438,
    radiusKm: 10,
  },
  {
    id: 'palanga',
    name: 'Palanga',
    locative: 'Palangoje',
    lat: 55.9175,
    lng: 21.0686,
    radiusKm: 14,
  },
  {
    id: 'kretinga',
    name: 'Kretinga',
    locative: 'Kretingoje',
    lat: 55.8892,
    lng: 21.2419,
    radiusKm: 8,
  },
  { id: 'plunge', name: 'Plungė', locative: 'Plungėje', lat: 55.9111, lng: 21.8442, radiusKm: 10 },
  { id: 'silute', name: 'Šilutė', locative: 'Šilutėje', lat: 55.3489, lng: 21.483, radiusKm: 10 },
  {
    id: 'druskininkai',
    name: 'Druskininkai',
    locative: 'Druskininkuose',
    lat: 54.0151,
    lng: 23.984,
    radiusKm: 12,
  },
  {
    id: 'birstonas',
    name: 'Birštonas',
    locative: 'Birštone',
    lat: 54.605,
    lng: 24.0333,
    radiusKm: 10,
  },
  { id: 'trakai', name: 'Trakai', locative: 'Trakuose', lat: 54.6378, lng: 24.9343, radiusKm: 10 },
  {
    id: 'elektrenai',
    name: 'Elektrėnai',
    locative: 'Elektrėnuose',
    lat: 54.7853,
    lng: 24.6631,
    radiusKm: 10,
  },
  {
    id: 'neringa',
    name: 'Neringa',
    locative: 'Neringoje',
    lat: 55.3036,
    lng: 21.005,
    radiusKm: 25,
  },
  {
    id: 'anyksciai',
    name: 'Anykščiai',
    locative: 'Anykščiuose',
    lat: 55.5253,
    lng: 25.1027,
    radiusKm: 10,
  },
]

export const DEFAULT_CITY_ID = 'vilnius'

export const CITY_IDS = CITIES.map((city) => city.id)

export const cityById = (id: string | null | undefined): City =>
  CITIES.find((city) => city.id === id) ?? CITIES[0]!

/** Great-circle distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export const isInCity = (city: City, point: { lat: number; lng: number }) =>
  distanceKm(city, point) <= city.radiusKm

/** The town a point belongs to, or the nearest one. */
export function nearestCity(point: { lat: number; lng: number }): City {
  return CITIES.reduce((best, city) =>
    distanceKm(city, point) < distanceKm(best, point) ? city : best,
  )
}
