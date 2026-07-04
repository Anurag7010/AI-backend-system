import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { queriesRepository, documentsRepository } from '@/db'
import { getDashboardCharts } from '@/lib/dashboard-charts'
import { DashboardClient } from './DashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

interface AiStats {
  avgLatencyMs: number
  errorRate: number
  cacheHitRate: number
  estimatedCostUsd: number
  totalTokens: number
  slowQueries: number
  failedRetrievals: number
}

interface ChartsData {
  queryVolumeData: Array<{ date: string; queries: number }>
  latencyData: Array<{ date: string; avgLatencyMs: number }>
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [allDocuments, recentQueries] = await Promise.all([
    documentsRepository.findByUser(session.userId),
    queriesRepository.findByUser(session.userId, 100),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const authHeader = { Authorization: `Bearer ${session.accessToken}` }

  // Charts come straight from the DB helper — no HTTP round-trip to our own
  // API. Stats still proxy through the API (it aggregates the Python backend)
  // but must be no-store: an explicit revalidate would cache one user's
  // authenticated response for everyone.
  const [statsRes, chartsRes] = await Promise.allSettled([
    fetch(`${appUrl}/api/dashboard/stats`, { headers: authHeader, cache: 'no-store' }),
    getDashboardCharts(session.userId),
  ])

  const statsData = statsRes.status === 'fulfilled' && statsRes.value.ok
    ? await statsRes.value.json() as { ai: AiStats | null; queries: { total: number; last24h: number }; documents: { total: number; ingested: number; failed: number; pending: number } }
    : null

  const charts: ChartsData | null = chartsRes.status === 'fulfilled' ? chartsRes.value : null

  const totalDocs = allDocuments.length
  const ingestedDocs = allDocuments.filter(d => d.status === 'ingested').length
  const failedDocs = allDocuments.filter(d => d.status === 'failed').length
  const totalQueries = recentQueries.length

  const aiStats = statsData?.ai ?? null

  const recentActivity = recentQueries.slice(0, 8).map(q => ({
    id: q.id,
    type: 'ask' as const,
    description: q.queryText.slice(0, 80),
    createdAt: q.createdAt.toISOString(),
    status: 'indexed' as const,
  }))

  const recentDocs = allDocuments.slice(0, 5).map(d => ({
    id: d.id,
    name: d.filename,
    time: d.createdAt.toISOString(),
    status: d.status as 'ingested' | 'pending' | 'failed',
  }))

  return (
    <DashboardClient
      totalDocs={totalDocs}
      ingestedDocs={ingestedDocs}
      failedDocs={failedDocs}
      totalQueries={totalQueries}
      queriesToday={statsData?.queries.last24h ?? 0}
      aiStats={aiStats}
      recentActivity={recentActivity}
      recentDocs={recentDocs}
      queryVolumeData={charts?.queryVolumeData ?? null}
    />
  )
}
