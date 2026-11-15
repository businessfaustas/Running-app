import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Database safety rules, checked against the migration files so a forgotten line can't ship:
 * with Supabase the database *is* the API, so every table and function is an endpoint and
 * must say who may use it.
 */

const dir = join(import.meta.dirname, '../../../supabase/migrations')
const sql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(dir, f), 'utf8'))
  .join('\n')

const tables = [
  ...sql.matchAll(/create table\s+(?:if not exists\s+)?(?:"?public"?\.)?"(\w+)"/gi),
].map((m) => m[1]!)

describe('migrations', () => {
  it('finds the public tables', () => {
    expect(tables.length).toBeGreaterThanOrEqual(9)
  })

  it.each(tables)('turns on row-level security for %s', (table) => {
    expect(sql).toMatch(
      new RegExp(`alter table\\s+(?:"?public"?\\.)?"?${table}"?\\s+enable row level security`, 'i'),
    )
  })

  it('makes every SECURITY DEFINER function pin its search_path (no schema hijacking)', () => {
    const definers = [...sql.matchAll(/create (?:or replace )?function[\s\S]*?\$\$[\s\S]*?\$\$/gi)]
      .map((m) => m[0])
      .filter((fn) => /security definer/i.test(fn))
    expect(definers.length).toBeGreaterThan(5)
    for (const fn of definers) {
      expect(fn, fn.slice(0, 80)).toMatch(/set search_path/i)
    }
  })

  it('keeps the private schema closed to the public', () => {
    expect(sql).toMatch(/revoke all on schema private from public/i)
  })

  // Reports can be filed without an account (the "Pranešk" form is open to everyone, as
  // content-reporting rules expect). It is insert-only, rate limited by a trigger and has no
  // read access. Anything else anonymous people may write has to be added here on purpose.
  const ANON_MAY_INSERT = new Set(['public.content_reports'])

  it('lets anonymous visitors write only where it is deliberate', () => {
    const grants = [...sql.matchAll(/grant\s+([a-z, ]+?)\s+on\s+([\w."]+)\s+to\s+([^;]+);/gi)]
    const anonWrites = grants
      .filter(
        ([, privileges, , roles]) =>
          /\banon\b/i.test(roles!) && /\b(all|insert|update|delete)\b/i.test(privileges!),
      )
      .map(([, , target]) => target!.replaceAll('"', ''))
    for (const target of anonWrites)
      expect(ANON_MAY_INSERT, `anon can write to ${target}`).toContain(target)
    // …and the one exception is insert-only.
    expect(sql).not.toMatch(
      /grant\s+(?:all|select|update|delete)[^;]*on\s+public\.content_reports[^;]*\banon\b/i,
    )
  })
})
