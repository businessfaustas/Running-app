import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  // Written straight into the Supabase CLI's migrations folder, timestamp-prefixed.
  out: '../../supabase/migrations',
  migrations: { prefix: 'supabase' },
  schemaFilter: ['public'],
  extensionsFilters: ['postgis'],
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
})
