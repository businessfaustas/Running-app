import { CLUBS } from '@pacemates/shared/clubs'
import { RACES } from '@pacemates/shared/races'
import { describe, expect, it } from 'vitest'
import {
  buildLlmsTxt,
  buildRobots,
  buildSitemap,
  clubJsonLd,
  FAQ,
  metaDescription,
  PRIVATE_PATHS,
  PUBLIC_PATHS,
  raceJsonLd,
  websiteJsonLd,
} from './seo'

const ORIGIN = 'https://pacemates.example'
// JSON-LD is free-form; the tests poke at it by path.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

describe('sitemap.xml', () => {
  const xml = buildSitemap(ORIGIN, RACES, CLUBS, '2026-11-15')
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!)

  it('lists every public page, race and club exactly once, with absolute URLs', () => {
    expect(locs).toHaveLength(PUBLIC_PATHS.length + RACES.length + CLUBS.length)
    expect(new Set(locs).size).toBe(locs.length)
    expect(locs.every((url) => url.startsWith(`${ORIGIN}/`))).toBe(true)
    expect(locs).toContain(`${ORIGIN}/races/${RACES[0]!.slug}`)
    expect(locs).toContain(`${ORIGIN}/clubs/${CLUBS[0]!.slug}`)
  })

  it('never lists an account or sign-in screen', () => {
    for (const path of PRIVATE_PATHS) {
      expect(locs.some((url) => url.startsWith(`${ORIGIN}${path}`) && path !== '/')).toBe(false)
    }
  })

  it('is well-formed XML with a lastmod for every URL', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml.match(/<url>/g)).toHaveLength(locs.length)
    expect(xml.match(/<lastmod>2026-11-15<\/lastmod>/g)).toHaveLength(locs.length)
    expect(xml).not.toMatch(/&(?!#\d+;)/) // every ampersand is escaped
  })

  it('stays under the 50 000-URL limit with room to grow', () => {
    expect(locs.length).toBeLessThan(5_000)
  })

  it('handles an origin with a trailing slash', () => {
    expect(buildSitemap(`${ORIGIN}/`, [], [], '2026-11-15')).toContain(`<loc>${ORIGIN}/</loc>`)
  })
})

describe('robots.txt', () => {
  const robots = buildRobots(ORIGIN)

  it('points at the sitemap', () => {
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })

  it('keeps every crawler, search and AI alike, out of private screens', () => {
    const groups = robots.split('\n\n').filter((g) => g.includes('User-agent'))
    expect(groups.length).toBeGreaterThanOrEqual(2)
    for (const group of groups) {
      for (const path of PRIVATE_PATHS) expect(group).toContain(`Disallow: ${path}`)
    }
  })

  it('welcomes the search and answer-engine crawlers by name', () => {
    for (const bot of ['Googlebot', 'Bingbot', 'GPTBot', 'ClaudeBot', 'PerplexityBot']) {
      expect(robots).toContain(`User-agent: ${bot}`)
    }
  })

  it('does not block the whole site', () => {
    expect(robots).not.toMatch(/^Disallow: \/$/m)
  })
})

describe('structured data', () => {
  it('describes the site, its publisher and a Lithuanian FAQ', () => {
    const [site, org, faq] = websiteJsonLd(ORIGIN) as Record<string, unknown>[]
    expect(site).toMatchObject({ '@type': 'WebSite', inLanguage: 'lt', url: `${ORIGIN}/` })
    expect(org).toMatchObject({ '@type': 'Organization', logo: `${ORIGIN}/icon-512.png` })
    expect(faq).toMatchObject({ '@type': 'FAQPage' })
    expect((faq!.mainEntity as unknown[]).length).toBe(FAQ.length)
    for (const { question, answer } of FAQ) {
      expect(question.endsWith('?')).toBe(true)
      expect(answer.length).toBeGreaterThan(40)
    }
  })

  it('gives each dated race a valid SportsEvent', () => {
    const dated = RACES.filter((r) => r.date)
    expect(dated.length).toBeGreaterThan(0)
    for (const race of dated) {
      const ld = raceJsonLd(race, ORIGIN) as Record<string, Any>
      expect(ld['@type']).toBe('SportsEvent')
      expect(ld.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(ld.name).toBe(race.name)
      expect(ld.location.geo.latitude).toBe(race.start.lat)
      expect(ld.url).toBe(`${ORIGIN}/races/${race.slug}`)
    }
  })

  it('gives no structured data to a race with no announced date, rather than inventing one', () => {
    const undated = RACES.find((r) => !r.date)
    expect(undated).toBeDefined()
    expect(raceJsonLd(undated!, ORIGIN)).toBeNull()
  })

  it('describes every club, linking only to the pages it really has', () => {
    for (const club of CLUBS) {
      const ld = clubJsonLd(club, ORIGIN) as Record<string, Any>
      expect(ld['@type']).toBe('SportsOrganization')
      expect(ld.location.address.addressLocality).toBe(club.city)
      if (ld.sameAs) for (const url of ld.sameAs) expect(url).toMatch(/^https?:\/\//)
      expect(ld.sameAs ?? []).not.toContain(null)
    }
  })

  it('survives being embedded in a script tag', () => {
    const json = JSON.stringify(websiteJsonLd(ORIGIN)).replaceAll('<', '\\u003c')
    expect(json).not.toContain('</script')
    expect(() => JSON.parse(json)).not.toThrow()
  })
})

describe('llms.txt', () => {
  it('maps the public pages and every race and club', () => {
    const txt = buildLlmsTxt(ORIGIN, RACES, CLUBS)
    expect(txt.startsWith('# PaceMates')).toBe(true)
    expect(txt).toContain(`${ORIGIN}/races/${RACES[0]!.slug}`)
    expect(txt).toContain(`${ORIGIN}/clubs/${CLUBS.at(-1)!.slug}`)
  })
})

describe('metaDescription', () => {
  it('keeps short text as it is and trims long text at a word, with an ellipsis', () => {
    expect(metaDescription('Trumpas aprašymas')).toBe('Trumpas aprašymas')
    const long = metaDescription('žodis '.repeat(60))
    expect(long.length).toBeLessThanOrEqual(155)
    expect(long.endsWith('…')).toBe(true)
    expect(long).not.toMatch(/\s…$/)
  })

  it('collapses line breaks and runs of spaces', () => {
    expect(metaDescription('a\n\n  b   c')).toBe('a b c')
  })

  it('has a usable description for every race and club page', () => {
    for (const race of RACES) {
      expect(
        metaDescription(`${race.name} – ${race.city}. ${race.description}`).length,
      ).toBeGreaterThan(40)
    }
  })
})

describe('data the URLs depend on', () => {
  it('has unique, URL-safe slugs for races and clubs', () => {
    for (const list of [RACES.map((r) => r.slug), CLUBS.map((c) => c.slug)]) {
      expect(new Set(list).size).toBe(list.length)
      for (const slug of list) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })
})
