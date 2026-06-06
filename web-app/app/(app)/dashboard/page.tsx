import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { queriesRepository, documentsRepository } from '@/db'
import { StatCard } from '@/components/dashboard/StatCard'
import { QueryVolumeChart } from '@/components/dashboard/QueryVolumeChart'
import { LatencyChart } from '@/components/dashboard/LatencyChart'
import { CacheGauge } from '@/components/dashboard/CacheGauge'
import { TokenUsageBar } from '@/components/dashboard/TokenUsageBar'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <path d="M1 4a1 1 0 011-1h4l2 2h6a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <path d="M14 8c0 3.314-2.686 6-6 6a6.19 6.19 0 01-2.86-.686L2 14l.936-2.186A5.981 5.981 0 012 8c0-3.314 2.686-6 6-6s6 2.686 6 6z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <path d="M8 1L1 14h14L8 1z" />
      <path d="M8 6v4M8 11.5v.5" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M10 1v18M1 10h18M4.4 4.4l11.2 11.2M15.6 4.4L4.4 15.6" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M17 17l-4-4" />
    </svg>
  )
}

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

  const [statsRes, chartsRes] = await Promise.allSettled([
    fetch(`${appUrl}/api/dashboard/stats`, { headers: authHeader, next: { revalidate: 30 } }),
    fetch(`${appUrl}/api/dashboard/charts`, { headers: authHeader, next: { revalidate: 60 } }),
  ])

  const statsData = statsRes.status === 'fulfilled' && statsRes.value.ok
    ? await statsRes.value.json() as { ai: AiStats | null; queries: { total: number; last24h: number }; documents: { total: number; ingested: number; failed: number; pending: number } }
    : null

  const charts = chartsRes.status === 'fulfilled' && chartsRes.value.ok
    ? await chartsRes.value.json() as ChartsData
    : null

  const totalDocs = allDocuments.length
  const ingestedDocs = allDocuments.filter(d => d.status === 'ingested').length
  const failedDocs = allDocuments.filter(d => d.status === 'failed').length
  const totalQueries = recentQueries.length

  const aiStats = statsData?.ai ?? null

  // Map recent queries to activity items
  const recentActivity = recentQueries.slice(0, 8).map(q => ({
    id: q.id,
    type: 'ask' as const,
    description: q.queryText.slice(0, 80),
    createdAt: q.createdAt.toISOString(),
  }))

  const quickActions = [
    { label: 'Upload Document', href: '/documents', icon: <UploadIcon />, desc: 'Add new PDFs' },
    { label: 'Start Chat', href: '/chat', icon: <ChatIcon />, desc: 'Ask questions' },
    { label: 'Run Agent', href: '/agent', icon: <SparkleIcon />, desc: 'Multi-step tasks' },
    { label: 'Search Chunks', href: '/search', icon: <SearchIcon />, desc: 'Explore retrieval' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your AI document intelligence overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={totalDocs}
          description={`${ingestedDocs} ingested`}
          icon={<FolderIcon />}
        />
        <StatCard
          label="Total Queries"
          value={totalQueries}
          description={`${statsData?.queries.last24h ?? 0} today`}
          icon={<ChatIcon />}
        />
        <StatCard
          label="Avg Latency"
          value={aiStats?.avgLatencyMs ? `${(aiStats.avgLatencyMs / 1000).toFixed(1)}s` : '—'}
          description="Last 24 hours"
          valueClassName={aiStats?.avgLatencyMs ? (aiStats.avgLatencyMs > 5000 ? 'text-red-500' : aiStats.avgLatencyMs > 3000 ? 'text-yellow-600' : undefined) : undefined}
          icon={<ClockIcon />}
        />
        <StatCard
          label="Failed Documents"
          value={failedDocs}
          description={failedDocs > 0 ? 'Needs attention' : 'All clear'}
          valueClassName={failedDocs > 0 ? 'text-red-500' : 'text-green-600'}
          icon={<AlertIcon />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Query Volume</p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <span className="text-xs text-muted-foreground">{totalQueries} total</span>
          </div>
          {charts?.queryVolumeData ? (
            <QueryVolumeChart data={charts.queryVolumeData} />
          ) : (
            <div className="h-40 bg-muted/50 rounded-lg animate-pulse" />
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Response Latency</p>
              <p className="text-xs text-muted-foreground">Average per day</p>
            </div>
            <span className="text-xs text-muted-foreground">Threshold: 5s</span>
          </div>
          {charts?.latencyData ? (
            <LatencyChart data={charts.latencyData} threshold={5000} />
          ) : (
            <div className="h-40 bg-muted/50 rounded-lg animate-pulse" />
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cache + token usage */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-6">
          <p className="text-sm font-semibold">Performance</p>
          <div className="flex justify-center">
            <CacheGauge hitRate={aiStats?.cacheHitRate ?? 0} />
          </div>
          <TokenUsageBar
            used={aiStats?.totalTokens ?? 0}
            budget={100000}
            estimatedCost={aiStats?.estimatedCostUsd ?? 0}
          />
        </div>

        {/* AI health */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold mb-4">AI System Health</p>
          <div className="space-y-0">
            {[
              {
                label: 'Error Rate',
                value: aiStats?.errorRate != null ? `${(aiStats.errorRate * 100).toFixed(1)}%` : '—',
                status: (aiStats?.errorRate ?? 0) > 0.05 ? 'error' : 'good',
              },
              {
                label: 'Slow Queries (>5s)',
                value: aiStats?.slowQueries ?? '—',
                status: (aiStats?.slowQueries ?? 0) > 5 ? 'warning' : 'good',
              },
              {
                label: 'Failed Retrievals',
                value: aiStats?.failedRetrievals ?? '—',
                status: (aiStats?.failedRetrievals ?? 0) > 0 ? 'warning' : 'good',
              },
              {
                label: 'Cost Today',
                value: aiStats?.estimatedCostUsd != null ? `$${aiStats.estimatedCostUsd.toFixed(4)}` : '—',
                status: 'neutral',
              },
            ].map(metric => (
              <div key={metric.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground">{metric.label}</span>
                <span className={cn(
                  'text-sm font-mono font-semibold',
                  metric.status === 'error' ? 'text-red-500' :
                  metric.status === 'warning' ? 'text-yellow-600' :
                  metric.status === 'good' ? 'text-green-600' :
                  'text-foreground'
                )}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">Recent Activity</p>
            <Link href="/chat" className="text-xs text-blue-600 hover:underline underline-offset-4">
              New chat →
            </Link>
          </div>
          <RecentActivityFeed items={recentActivity} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map(action => (
          <Link
            key={action.label}
            href={action.href}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border border-border bg-card',
              'hover:shadow-md hover:border-border/80 transition-all duration-150',
              'group active:scale-[0.98]'
            )}
          >
            <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              {action.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
