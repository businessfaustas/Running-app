import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

// `prepare: false` keeps us compatible with Supabase's transaction-mode pooler (port 6543).
export const queryClient = postgres(env.DATABASE_URL, { prepare: false })
export const db = drizzle(queryClient, { schema })
