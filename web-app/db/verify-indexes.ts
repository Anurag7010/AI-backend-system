import db from './connection'
import { sql } from 'drizzle-orm'

type PlanRow = { 'QUERY PLAN': string }

async function verifyIndexes(): Promise<void> {
  console.log('Verifying database indexes...\n')

  const queries: Array<{ name: string; query: ReturnType<typeof sql> }> = [
    {
      name: 'Find documents by user_id',
      query: sql`EXPLAIN ANALYZE SELECT * FROM documents WHERE user_id = gen_random_uuid() LIMIT 10`,
    },
    {
      name: 'Find queries by user_id',
      query: sql`EXPLAIN ANALYZE SELECT * FROM queries WHERE user_id = gen_random_uuid() ORDER BY created_at DESC LIMIT 50`,
    },
    {
      name: 'Find queries by document_id',
      query: sql`EXPLAIN ANALYZE SELECT * FROM queries WHERE document_id = gen_random_uuid()`,
    },
    {
      name: 'Find documents by status',
      query: sql`EXPLAIN ANALYZE SELECT * FROM documents WHERE status = 'pending'`,
    },
  ]

  for (const { name, query } of queries) {
    console.log(`Query: ${name}`)
    try {
      const rows = (await db.execute(query)) as PlanRow[]
      const plan = rows.map((r) => r['QUERY PLAN']).join('\n')
      const usesIndex = plan.includes('Index Scan') || plan.includes('Index Only Scan')
      const usesScan = plan.includes('Seq Scan')
      console.log(usesIndex ? '✓ Using index' : usesScan ? '✗ Sequential scan — ADD INDEX' : '? Unknown')
      console.log(plan.split('\n')[0])
    } catch (err) {
      console.log(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
    console.log()
  }

  process.exit(0)
}

verifyIndexes().catch(console.error)
