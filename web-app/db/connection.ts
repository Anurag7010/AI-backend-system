import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Single shared connection pool — one pool per process is correct
// Creating a new pool per request would exhaust database connections instantly
// postgres() handles pooling internally
export const pool = postgres(process.env.DATABASE_URL, {
  max: 10,          // maximum pool size
  idle_timeout: 30, // close idle connections after 30s
})

// Drizzle instance — pass schema so Drizzle knows all table definitions
const db = drizzle(pool, { schema })

export default db
