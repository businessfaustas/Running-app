// Performance budget: fails when the first screen gets heavier than agreed.
// Run after `pnpm build`:  pnpm --filter @pacemates/web budget
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = new URL('../dist/', import.meta.url).pathname
const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10
const gz = (file) => gzipSync(readFileSync(join(dist, file))).length

const BUDGET = {
  initialJsGzKb: 260, // everything the home page loads before it can show anything
  initialCssGzKb: 30,
  photoKb: 80, // each file in /photos and /clubs
  ogImageKb: 300,
}

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1].slice(1))
const js = [...new Set(refs.filter((f) => f.endsWith('.js')))]
const css = [...new Set(refs.filter((f) => f.endsWith('.css')))]
const jsKb = kb(js.reduce((sum, f) => sum + gz(f), 0))
const cssKb = kb(css.reduce((sum, f) => sum + gz(f), 0))

const problems = []
const report = []
report.push(`first-load JS   ${jsKb} kB gzip (budget ${BUDGET.initialJsGzKb}) – ${js.length} files`)
report.push(`first-load CSS  ${cssKb} kB gzip (budget ${BUDGET.initialCssGzKb})`)
if (jsKb > BUDGET.initialJsGzKb) problems.push(`first-load JS is ${jsKb} kB gzip`)
if (cssKb > BUDGET.initialCssGzKb) problems.push(`first-load CSS is ${cssKb} kB gzip`)

// The map library is huge and must stay out of the first load.
if (js.some((f) => /maplibre/i.test(f))) problems.push('maplibre-gl is in the first load')

for (const dir of ['photos', 'clubs']) {
  for (const name of readdirSync(join(dist, dir))) {
    const size = kb(statSync(join(dist, dir, name)).size)
    if (size > BUDGET.photoKb) problems.push(`${dir}/${name} is ${size} kB (max ${BUDGET.photoKb})`)
  }
}
const og = kb(statSync(join(dist, 'og.png')).size)
if (og > BUDGET.ogImageKb) problems.push(`og.png is ${og} kB (max ${BUDGET.ogImageKb})`)

console.log(report.join('\n'))
if (problems.length) {
  console.error('\nOver budget:\n- ' + problems.join('\n- '))
  process.exit(1)
}
console.log('Within budget.')
