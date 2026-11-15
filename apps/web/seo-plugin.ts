import type { Plugin } from 'vite'
import { CLUBS } from '../../packages/shared/src/clubs.ts'
import { RACES } from '../../packages/shared/src/races.ts'
import { buildLlmsTxt, buildRobots, buildSitemap } from './src/lib/seo.ts'

/**
 * Writes sitemap.xml, robots.txt and llms.txt from the race and club lists, so a new race
 * appears in search results with the next deploy and nobody has to edit three files by hand.
 * Also serves them from the dev server.
 */
export function seoFiles(origin: () => string): Plugin {
  const files = () => {
    const base = origin() || 'http://localhost:5173'
    const today = new Date().toISOString().slice(0, 10)
    return {
      'sitemap.xml': buildSitemap(base, RACES, CLUBS, today),
      'robots.txt': buildRobots(base),
      'llms.txt': buildLlmsTxt(base, RACES, CLUBS),
    } as Record<string, string>
  }
  return {
    name: 'pacemates:seo-files',
    generateBundle() {
      for (const [fileName, source] of Object.entries(files())) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').split('?')[0]!.slice(1)
        const body = files()[name]
        if (body === undefined) return next()
        res.setHeader('Content-Type', name.endsWith('.xml') ? 'application/xml' : 'text/plain')
        res.end(body)
      })
    },
  }
}
