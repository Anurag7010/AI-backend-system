import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { documentsRepository } from "@/db";
import { queriesRepository } from "@/db";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { Metadata } from "next";
import type { Query } from "@/types";

interface AiStats {
  avgLatencyMs: number;
  errorRate: number;
  cacheHitRate: number;
  estimatedCostUsd: number;
  totalTokens: number;
  slowQueries: number;
  failedRetrievals: number;
}

export const metadata: Metadata = { title: "Dashboard" };

// RecentQueriesList — Server Component, defined in same file.
// Receives already-fetched data — no second database call.
// Kept as a Server Component because it is purely presentational
// and does not need any browser APIs or interactivity.
function RecentQueriesList({ queries }: { queries: Query[] }) {
  if (queries.length === 0) {
    return (
      <EmptyState
        title="No queries yet"
        description="Ask a question in the Chat page to get started."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {queries.slice(0, 5).map((q) => (
        <li key={q.id} className="py-3 flex items-start justify-between gap-4">
          <p className="text-sm text-foreground line-clamp-2 flex-1">
            {q.queryText}
          </p>
          <RelativeTime date={q.createdAt} className="flex-shrink-0 text-xs" />
        </li>
      ))}
    </ul>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-6 w-6 text-brand-500"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-6 w-6 text-brand-500"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Promise.all fetches both simultaneously — total time = max(docsTime, queriesTime).
  // Sequential awaits would cost docsTime + queriesTime. For two independent DB queries
  // this is always the wrong pattern — there is no reason to wait for one before starting the other.
  const [allDocuments, recentQueries] = await Promise.all([
    documentsRepository.findByUser(session.userId),
    queriesRepository.findByUser(session.userId, 50),
  ]);

  // Fetch AI metrics from stats endpoint — non-fatal if backend is down
  let aiStats: AiStats | null = null
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const statsRes = await fetch(`${appUrl}/api/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Request-ID': crypto.randomUUID(),
      },
      next: { revalidate: 30 },
    })
    if (statsRes.ok) {
      const statsData = await statsRes.json() as { ai: AiStats | null }
      aiStats = statsData.ai
    }
  } catch {
    // Non-fatal — dashboard still works without AI metrics
  }

  const totalDocs = allDocuments.length;
  const ingestedDocs = allDocuments.filter(
    (d) => d.status === "ingested",
  ).length;
  const failedDocs = allDocuments.filter((d) => d.status === "failed").length;
  const totalQueries = recentQueries.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-display-sm text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {session.email}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={totalDocs}
          description="All documents"
        />
        <StatCard
          label="Ingested"
          value={ingestedDocs}
          description="Ready to query"
        />
        <StatCard
          label="Failed"
          value={failedDocs}
          description="Need attention"
          // Highlight failed count in red only when there are failures
          valueClassName={failedDocs > 0 ? "text-error-500" : undefined}
        />
        <StatCard
          label="Total Queries"
          value={totalQueries}
          description="Queries made"
        />
      </div>

      {/* AI Observability */}
      {aiStats && (
        <Card>
          <Card.Header>
            <Card.Title>AI Observability</Card.Title>
            <Card.Description>Last 24 hours</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                label="Avg Response"
                value={`${aiStats.avgLatencyMs}ms`}
                description="LLM latency"
              />
              <StatCard
                label="Cache Hit"
                value={`${(aiStats.cacheHitRate * 100).toFixed(0)}%`}
                description="Cache efficiency"
              />
              <StatCard
                label="Est. Cost"
                value={`$${aiStats.estimatedCostUsd.toFixed(4)}`}
                description="Today (USD)"
              />
              <StatCard
                label="Error Rate"
                value={`${(aiStats.errorRate * 100).toFixed(1)}%`}
                description="LLM errors"
                valueClassName={aiStats.errorRate > 0.05 ? 'text-error-500' : undefined}
              />
              <StatCard
                label="Slow Queries"
                value={aiStats.slowQueries}
                description=">5s response"
                valueClassName={aiStats.slowQueries > 0 ? 'text-warning-500' : undefined}
              />
              <StatCard
                label="Failed RAG"
                value={aiStats.failedRetrievals}
                description="Empty retrieval"
                valueClassName={aiStats.failedRetrievals > 0 ? 'text-error-500' : undefined}
              />
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <Card.Header>
          <Card.Title>Recent Activity</Card.Title>
          <Card.Description>Your last 5 queries</Card.Description>
        </Card.Header>
        <Card.Content>
          <RecentQueriesList queries={recentQueries as Query[]} />
        </Card.Content>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-6 flex items-start gap-4">
          <UploadIcon />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Upload Document
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Add a PDF to your knowledge base for AI-powered Q&amp;A
            </p>
            <Link href="/documents">
              <Button size="sm" variant="secondary">
                Go to Documents
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6 flex items-start gap-4">
          <ChatIcon />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Ask a Question
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Query your documents using natural language
            </p>
            <Link href="/chat">
              <Button size="sm" variant="secondary">
                Open Chat
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
