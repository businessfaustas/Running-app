import type { Club, Race } from '@pacemates/shared'

/*
 * Search and answer-engine optimisation, as plain functions: the build uses them to write
 * sitemap.xml, robots.txt and llms.txt (apps/web/seo-plugin.ts), and the pages use them for
 * their structured data (usePageMeta). Nothing here touches the browser, so it is all tested.
 */

export const SITE_NAME = 'PaceMates'
export const SITE_TAGLINE = 'Bėk. Mink. Kartu.'
export const SITE_DESCRIPTION =
  'PaceMates – rask, su kuo bėgti ar minti. Grupinės bėgimo ir dviračių treniruotės, varžybų kalendorius ir klubai visoje Lietuvoje.'

/** Pages anyone can open and search engines should list. Everything behind a sign-in is left out. */
export const PUBLIC_PATHS = ['/', '/races', '/clubs', '/leaderboard', '/privatumas', '/salygos']

/** Paths crawlers are asked to stay out of: account screens and one-off auth links. */
export const PRIVATE_PATHS = [
  '/auth/',
  '/signin',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/settings',
  '/inbox',
  '/profile',
  '/plans',
  '/workouts/new',
]

const trimSlash = (url: string) => url.replace(/\/+$/, '')
const abs = (origin: string, path: string) => `${trimSlash(origin)}${path}`

const xmlEscape = (text: string) => text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** Question and answer pairs for the home page: written for people and for answer engines. */
export const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Kas yra PaceMates?',
    answer:
      'PaceMates yra socialinis ištvermės sporto kalendorius: bėgikai ir dviratininkai paskelbia būsimas treniruotes 24 valandų laiko juostoje kaip atviras kvietimus, o kiti gali rasti treniruočių partnerių ir prisijungti.',
  },
  {
    question: 'Kaip prisijungti prie grupinės treniruotės?',
    answer:
      'Atidaryk treniruotę, pažiūrėk tempą, atstumą ir susitikimo vietą, tada spausk „Dalyvausiu“. Prisijungusiems atsiranda treniruotės grupės pokalbis.',
  },
  {
    question: 'Kokiuose miestuose veikia PaceMates?',
    answer:
      'Galima rinktis iš 25 Lietuvos miestų, tarp jų Klaipėdos, Vilniaus, Kauno ir Šiaulių. Treniruotės, lyderių lentelė ir klubų sąrašas rodomi pagal pasirinktą miestą.',
  },
  {
    question: 'Ar PaceMates turi Lietuvos varžybų kalendorių?',
    answer:
      'Taip. Varžybų skiltyje rasi kelių, trail, ultra, dviračių ir triatlono varžybas su datomis, distancijomis, aprašymais ir oficialiomis svetainėmis, o prie kiekvienų – dalyvių sąrašą ir forumą.',
  },
]

export function websiteJsonLd(origin: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: `${SITE_NAME} – ${SITE_TAGLINE}`,
      url: `${trimSlash(origin)}/`,
      inLanguage: 'lt',
      description: SITE_DESCRIPTION,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${trimSlash(origin)}/`,
      logo: abs(origin, '/icon-512.png'),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: 'lt',
      mainEntity: FAQ.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ]
}

const SPORT_BY_RACE_TYPE: Record<Race['type'], string> = {
  ROAD: 'Running',
  TRAIL: 'Trail running',
  ULTRA: 'Ultramarathon',
  CYCLING: 'Cycling',
  TRIATHLON: 'Triathlon',
}

/**
 * Structured data for a race. Search engines need a start date, so races whose next edition
 * isn't announced yet get none rather than an invented one.
 */
export function raceJsonLd(race: Race, origin: string) {
  if (!race.date) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.name,
    description: race.description,
    startDate: race.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: SPORT_BY_RACE_TYPE[race.type],
    inLanguage: 'lt',
    url: abs(origin, `/races/${race.slug}`),
    ...(race.website ? { sameAs: race.website } : {}),
    location: {
      '@type': 'Place',
      name: race.city,
      address: {
        '@type': 'PostalAddress',
        addressLocality: race.city,
        addressRegion: race.region,
        addressCountry: 'LT',
      },
      geo: { '@type': 'GeoCoordinates', latitude: race.start.lat, longitude: race.start.lng },
    },
  }
}

export function clubJsonLd(club: Club, origin: string) {
  const links = [club.website, club.facebook, club.instagram, club.strava].filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: club.name,
    description: club.description,
    url: abs(origin, `/clubs/${club.slug}`),
    inLanguage: 'lt',
    ...(club.founded ? { foundingDate: String(club.founded) } : {}),
    ...(links.length ? { sameAs: links } : {}),
    ...(club.email ? { email: club.email } : {}),
    location: {
      '@type': 'Place',
      name: club.meetingPlace ?? club.city,
      address: { '@type': 'PostalAddress', addressLocality: club.city, addressCountry: 'LT' },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: club.location.lat,
        longitude: club.location.lng,
      },
    },
  }
}

/** A short, plain-text description for <meta name="description"> (about 155 characters). */
export function metaDescription(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length)}…`
}

export function buildSitemap(origin: string, races: Race[], clubs: Club[], lastmod: string) {
  const urls = [
    ...PUBLIC_PATHS,
    ...races.map((r) => `/races/${r.slug}`),
    ...clubs.map((c) => `/clubs/${c.slug}`),
  ]
  const body = urls
    .map(
      (path) =>
        `  <url><loc>${xmlEscape(abs(origin, path))}</loc><lastmod>${lastmod}</lastmod></url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

/** Search and answer-engine crawlers that are welcome to read the public pages. */
const WELCOME_BOTS = [
  'Googlebot',
  'Bingbot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
]

export function buildRobots(origin: string) {
  const disallow = PRIVATE_PATHS.map((p) => `Disallow: ${p}`).join('\n')
  const welcome = WELCOME_BOTS.map((bot) => `User-agent: ${bot}`).join('\n')
  return `# Public pages are open to search and answer engines; account screens are not.
User-agent: *
${disallow}

${welcome}
Allow: /
${disallow}

Sitemap: ${abs(origin, '/sitemap.xml')}
`
}

/** llms.txt: a plain-text map of the site for language-model crawlers. */
export function buildLlmsTxt(origin: string, races: Race[], clubs: Club[]) {
  const raceLines = races
    .map((r) => `- [${r.name}](${abs(origin, `/races/${r.slug}`)}): ${r.city}`)
    .join('\n')
  const clubLines = clubs
    .map((c) => `- [${c.name}](${abs(origin, `/clubs/${c.slug}`)}): ${c.city}`)
    .join('\n')
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a social endurance-sports calendar in Lithuanian. Runners and cyclists post
upcoming group workouts on a 24-hour timeline; others find training partners and join.
Workouts, chats and profiles need an account; the pages below are public.

## Pages
- [Varžybos](${abs(origin, '/races')}): calendar of Lithuanian road, trail, ultra, cycling and triathlon races
- [Klubai](${abs(origin, '/clubs')}): running, triathlon and cycling clubs by town
- [Lyderiai](${abs(origin, '/leaderboard')}): weekly and monthly leaderboards
- [Privatumas](${abs(origin, '/privatumas')}): privacy policy
- [Sąlygos](${abs(origin, '/salygos')}): terms of use

## Races
${raceLines}

## Clubs
${clubLines}
`
}
