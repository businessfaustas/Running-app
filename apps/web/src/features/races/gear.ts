import type { Race } from '@pacemates/shared'
import { fromISODate } from '@pacemates/shared'

export interface GearItem {
  id: string
  text: string
  /** Often required by organisers or hard to do without. */
  essential?: boolean
}

export interface GearGroup {
  title: string
  items: GearItem[]
}

type Season = 'winter' | 'shoulder' | 'summer'

const monthOf = (race: Race) =>
  race.date ? fromISODate(race.date).getMonth() + 1 : race.typicalMonth

function seasonOf(race: Race): Season {
  const month = monthOf(race)
  if (month <= 3 || month >= 11) return 'winter'
  if (month >= 6 && month <= 8) return 'summer'
  return 'shoulder'
}

/**
 * A packing list from the race's type, course and season. Rules of thumb for Lithuanian
 * conditions – a starting point people tick off and add to in the forum.
 */
export function gearFor(race: Race, distanceKm: number): GearGroup[] {
  const has = (surface: Race['surface'][number]) => race.surface.includes(surface)
  const season = seasonOf(race)
  const groups: GearGroup[] = []
  const item = (id: string, text: string, essential = false): GearItem => ({ id, text, essential })

  if (race.type === 'CYCLING') {
    groups.push({
      title: 'Dviratis',
      items: [
        item('helmet', 'Šalmas – be jo į startą neleidžia', true),
        item('service', 'Patikrintos padangos, stabdžiai ir sutepta grandinė', true),
        item('spare', 'Atsarginė kamera, montiruotės, pompa ar CO₂', true),
        item('multitool', 'Daugiafunkcis raktas'),
        ...(has('gravel')
          ? [item('tyres', 'Platesnės padangos (≥ 35 mm) žvyrui, žemesnis slėgis')]
          : []),
        item('lights', 'Priekinis ir galinis žibintai', season !== 'summer'),
      ],
    })
  }

  if (race.type === 'TRIATHLON') {
    groups.push({
      title: 'Plaukimas',
      items: [
        item('wetsuit', 'Hidrokostiumas (ežere dažnai privalomas, kai vanduo < 16 °C)', true),
        item('goggles', 'Plaukimo akiniai + atsarginiai', true),
        item('cap', 'Organizatorių kepuraitė (išduodama registruojantis)'),
        item('antifog', 'Antirasojantis skystis akiniams'),
      ],
    })
    groups.push({
      title: 'Dviratis ir pereinamoji zona',
      items: [
        item('tri-helmet', 'Šalmas – užsisegti prieš paimant dviratį', true),
        item('tri-shoes', 'Bėgimo bateliai su elastiniais raišteliais greitam perėjimui'),
        item('race-belt', 'Numerio diržas'),
        item('towel', 'Mažas rankšluostis zonoje'),
      ],
    })
  }

  if (race.type === 'ROAD' || race.type === 'TRAIL' || race.type === 'ULTRA') {
    const trail = race.type !== 'ROAD'
    groups.push({
      title: 'Avalynė',
      items: trail
        ? [
            item('trail-shoes', 'Trail bateliai su ryškiu protektoriumi (4–5 mm)', true),
            ...(has('sand') || has('dunes')
              ? [item('gaiters', 'Getrai – kad smėlis nepatektų į batus', true)]
              : []),
            ...(has('mud') ? [item('mud', 'Bateliai su gilesniu protektoriumi purvui')] : []),
            ...(season === 'winter' ? [item('spikes', 'Smaigai ar „microspikes“ ledui')] : []),
            item('socks', 'Sintetinės ar vilnonės kojinės (ne medvilnė)'),
          ]
        : [
            item('road-shoes', 'Išbandyti bėgimo bateliai (bent 50 km treniruotėse)', true),
            ...(distanceKm >= 21
              ? [
                  item(
                    'race-shoes',
                    'Varžybų bateliai su plokštele – tik jei bėgai su jais ilgąsias',
                  ),
                ]
              : []),
            ...(has('cobbles')
              ? [item('cobbles', 'Stabilūs bateliai grindiniui senamiestyje')]
              : []),
            item('socks', 'Plonos sintetinės kojinės be siūlių'),
          ],
    })

    const clothes: GearItem[] = []
    if (season === 'winter') {
      clothes.push(
        item('base', 'Termo apatinis sluoksnis', true),
        item('gloves', 'Pirštinės ir kepurė ar galvos juosta', true),
        item('tights', 'Ilgos tamprės'),
      )
    } else if (season === 'shoulder') {
      clothes.push(
        item('layers', 'Plonas ilgarankovis ir marškinėliai – nusirengsi šilstant'),
        item('arm', 'Lengvos pirštinės rytiniam startui'),
      )
    } else {
      clothes.push(
        item('cap', 'Kepurėlė ar skara nuo saulės', true),
        item('spf', 'Apsauginis kremas nuo saulės (SPF 30+)'),
      )
    }
    if (has('coast') || has('dunes'))
      clothes.push(item('wind', 'Vėjo striukė – prie jūros pučia stipriai', true))
    if (race.type === 'ULTRA' || (trail && distanceKm >= 30)) {
      clothes.push(item('rain', 'Neperšlampama striukė su gobtuvu (ultra dažnai privaloma)', true))
    }
    if (distanceKm >= 21) clothes.push(item('chafe', 'Vazelinas ar „anti-chafe“ trinties vietoms'))
    if (distanceKm >= 42) clothes.push(item('nipple', 'Pleistrai speneliams nuo trinties'))
    groups.push({ title: 'Apranga', items: clothes })
  }

  const fuel: GearItem[] = []
  if (distanceKm >= 15 || race.type === 'CYCLING' || race.type === 'TRIATHLON') {
    fuel.push(item('gels', 'Geliai ar batonėliai pagal mitybos planą', distanceKm >= 21))
  }
  if (race.type === 'TRAIL' || race.type === 'ULTRA') {
    fuel.push(
      item(
        'vest',
        distanceKm >= 21 ? 'Bėgimo liemenė su 1–1,5 l vandens' : 'Gertuvė ar diržas su buteliuku',
        distanceKm >= 21,
      ),
    )
    fuel.push(item('cup', 'Sulankstomas puodelis – daugelyje trail varžybų vienkartinių nėra'))
  } else if (race.type === 'CYCLING') {
    fuel.push(item('bottles', '2 gertuvės po 750 ml', true))
  } else if (distanceKm >= 21) {
    fuel.push(item('belt', 'Diržas geliams (gėrimo punktai paprastai kas ~5 km)'))
  }
  if (season === 'summer' || distanceKm >= 42)
    fuel.push(item('salt', 'Druskos tabletės ar elektrolitai'))
  if (fuel.length > 0) groups.push({ title: 'Mityba ir skysčiai', items: fuel })

  const safety: GearItem[] = [
    item('bib', 'Starto numeris ir smeigtukai / numerio diržas', true),
    item('id', 'Asmens dokumentas ir telefonas'),
  ]
  if (race.type === 'ULTRA' || has('night')) {
    safety.push(
      item('lamp', 'Galvos žibintuvėlis + atsarginės baterijos', true),
      item('blanket', 'Termoplėvelė ir švilpukas', true),
    )
  }
  if (race.type === 'TRAIL' || race.type === 'ULTRA') {
    safety.push(item('gpx', 'Trasa (GPX) laikrodyje ar telefone'))
  }
  if (has('swim'))
    safety.push(item('swim-safety', 'Ryški plaukimo kepuraitė – kad matytų gelbėtojai'))
  safety.push(item('dry', 'Sausi drabužiai ir šlepetės po finišo'))
  groups.push({ title: 'Saugumas ir kita', items: safety })

  return groups
}

/** Typical daytime temperature in Lithuania for each month, °C. */
const TYPICAL_TEMP_C = [-2, -1, 4, 11, 17, 21, 23, 22, 17, 10, 4, 0]

/**
 * The fuelling calculator, prefilled for this race and course. Only for running – the
 * calculator's energy model is per kilometre on foot, so it doesn't fit rides or triathlons.
 */
export function fuelingPath(race: Race, distanceKm: number): string | null {
  if (race.type !== 'ROAD' && race.type !== 'TRAIL' && race.type !== 'ULTRA') return null
  const longest = race.distances[0] ?? distanceKm
  const params = new URLSearchParams({
    distance: String(distanceKm),
    temp: String(TYPICAL_TEMP_C[monthOf(race) - 1]),
    race: race.name,
  })
  // Climbing scales with the course chosen; the catalogue gives it for the longest one.
  if (race.elevationGainM) {
    params.set('elevation', String(Math.round((race.elevationGainM * distanceKm) / longest)))
  }
  return `/fueling?${params.toString()}`
}
