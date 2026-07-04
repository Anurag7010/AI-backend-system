import 'server-only'
import db from '@/db/connection'
import { queries } from '@/db/schema'
import { eq, gte, and } from 'drizzle-orm'
import { subDays, format, startOfDay } from 'date-fns'

export interface QueryVolumePoint {
  date: string
  queries: number
}

export interface LatencyPoint {
  date: string
  avgLatencyMs: number
}

export interface DashboardCharts {
  queryVolumeData: QueryVolumePoint[]
  latencyData: LatencyPoint[]
}

/**
 * 7-day query volume and latency buckets for one user.
 * Shared by the dashboard server component and /api/dashboard/charts so the
 * page never has to fetch its own API over HTTP (which cached responses
 * across users when given an explicit revalidate).
 */
export async function getDashboardCharts(userId: string): Promise<DashboardCharts> {
  const since = subDays(new Date(), 7)

  const recentQueries = await db
    .select({
      createdAt: queries.createdAt,
      latencyMs: queries.latencyMs,
    })
    .from(queries)
    .where(and(
      eq(queries.userId, userId),
      gte(queries.createdAt, since)
    ))

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    return format(startOfDay(date), 'MMM d')
  })

  const buckets: Record<string, { count: number; latencies: number[] }> = {}
  days.forEach(d => { buckets[d] = { count: 0, latencies: [] } })

  for (const q of recentQueries) {
    if (!q.createdAt) continue
    const day = format(startOfDay(new Date(q.createdAt)), 'MMM d')
    if (buckets[day]) {
      buckets[day].count++
      if (q.latencyMs !== null && q.latencyMs !== undefined) buckets[day].latencies.push(q.latencyMs)
    }
  }

  const queryVolumeData = days.map(d => ({
    date: d,
    queries: buckets[d]?.count ?? 0,
  }))

  const latencyData = days.map(d => {
    const lats = buckets[d]?.latencies ?? []
    return {
      date: d,
      avgLatencyMs: lats.length > 0
        ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length)
        : 0,
    }
  })

  return { queryVolumeData, latencyData }
}
