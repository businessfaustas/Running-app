import type { SportType } from '@pacemates/shared'
import { wallClock } from '../lib/clock'

export interface Quote {
  text: string
  /** Null for PaceMates' own lines. */
  author: string | null
}

export const QUOTES: Quote[] = [
  { text: 'Joks žmogus nėra ribotas.', author: 'Eliud Kipchoge' },
  {
    text: 'Jei nori bėgti, nubėk mylią. Jei nori patirti kitokį gyvenimą – nubėk maratoną.',
    author: 'Emil Zátopek',
  },
  { text: 'Vienam – greičiau. Kartu – toliau.', author: 'Afrikiečių patarlė' },
  {
    text: 'Duoti mažiau nei viską, ką gali, reiškia iššvaistyti dovaną.',
    author: 'Steve Prefontaine',
  },
  { text: 'Važiuok daug ar mažai, toli ar arti. Bet važiuok.', author: 'Eddy Merckx' },
  { text: 'Lengviau nebūna – tiesiog važiuoji greičiau.', author: 'Greg LeMond' },
  { text: 'Blogiausia treniruotė – ta, kuri neįvyko.', author: null },
  { text: 'Nesvarbu, kaip lėtai eini, svarbu nesustoti.', author: 'Konfucijus' },
  { text: 'Lėtas kilometras vis tiek yra kilometras.', author: null },
  { text: 'Šiandienos kilometrai – rytojaus lengvumas.', author: null },
]

type FactSport = 'run' | 'ride' | 'any'

export interface FunFact {
  text: string
  sport: FactSport
  /** A short "headline number" for the card. */
  figure: string
}

export const FUN_FACTS: FunFact[] = [
  {
    figure: '42,195',
    sport: 'run',
    text: 'Maratono distancija atsirado 1908 m. Londono olimpiadoje, o oficialia tapo 1921 m.',
  },
  {
    figure: '1:59:40',
    sport: 'run',
    text: '2019 m. Eliudas Kipchoge pirmasis nubėgo maratoną greičiau nei per 2 valandas (neoficialiai).',
  },
  {
    figure: '2–3×',
    sport: 'run',
    text: 'Kiekvieno bėgimo žingsnio metu kojas apkrauna jėga, 2–3 kartus didesnė už kūno svorį.',
  },
  {
    figure: '~3 %',
    sport: 'run',
    text: 'Tyrime bėgdami besišypsantys bėgikai bėgo maždaug 3 % ekonomiškiau. Šypsokis!',
  },
  {
    figure: '25 000+',
    sport: 'any',
    text: 'Tiek kartų per maratoną susitraukia širdis. Ji irgi treniruojasi kartu su tavimi.',
  },
  {
    figure: '150',
    sport: 'any',
    text: 'PSO rekomenduoja suaugusiems per savaitę bent 150–300 minučių vidutinio intensyvumo judėjimo.',
  },
  {
    figure: '1903',
    sport: 'ride',
    text: 'Tais metais įvyko pirmasis „Tour de France“: 6 etapai ir beveik 2 430 km.',
  },
  {
    figure: '⅓',
    sport: 'ride',
    text: 'Važiuojant iškart už kito dviratininko, oro pasipriešinimas sumažėja maždaug trečdaliu.',
  },
  {
    figure: 'Z2',
    sport: 'any',
    text: 'Zona 2 – tempas, kuriuo dar gali kalbėtis pilnais sakiniais. Jis kloja ištvermės pamatą.',
  },
  {
    figure: '#1',
    sport: 'ride',
    text: 'Dviratis – vienas efektyviausių judėjimo būdų: tam pačiam atstumui sunaudoja mažiau energijos nei ėjimas.',
  },
]

export interface Tip {
  title: string
  text: string
}

export const TIPS: Tip[] = [
  {
    title: 'Pirmą kartą grupėje?',
    text: 'Prisistatyk organizatoriui ir pasakyk savo tempą. Pradėk lėčiau – pagreitinti visada spėsi.',
  },
  {
    title: 'Atvyk 5 minutes anksčiau',
    text: 'Grupės startuoja laiku. Batų raištelius ir laikrodį susitvarkyk iš anksto.',
  },
  {
    title: 'Per greita? Pasakyk',
    text: 'Organizatoriai mieliau sulėtins, nei paliks ką nors vieną. Tam ir yra grupė.',
  },
  {
    title: 'Tamsoje – šviesa',
    text: 'Vakare pasiimk žibintuvėlį ar atšvaitą. Dviratininkams žibintai tamsiu paros metu privalomi.',
  },
  {
    title: 'Po finišo – neskubėk',
    text: 'Geriausi pokalbiai vyksta po treniruotės. Kava kartu – pusė malonumo.',
  },
]

/** Day number since 1970, for picking "today's" item the same for everyone. */
function dayNumber(date = wallClock()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
}

export function quoteOfTheDay(offset = 0, date = wallClock()): Quote {
  return QUOTES[(dayNumber(date) + offset) % QUOTES.length]!
}

/** A fact that suits the workout, stable for a given seed (e.g. a workout id). */
export function factFor(sport: SportType, seed: string): FunFact {
  const kind: FactSport = sport === 'CYCLING' || sport === 'GRAVEL' ? 'ride' : 'run'
  const pool = FUN_FACTS.filter((f) => f.sport === kind || f.sport === 'any')
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return pool[Math.abs(h) % pool.length]!
}
