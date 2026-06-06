import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()


export default defineConfig({
  // Source of truth — drizzle-kit reads this to generate migrations
  schema: './db/schema.ts', 
  // Where generated migration files are stored — commit these to git
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})