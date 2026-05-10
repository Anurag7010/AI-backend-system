import { getSession } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Stub data fetchers — replace with real db calls on integration day
async function getDocumentCount(userId: string): Promise<number> {
  // Real: return db.select({ count }).from(documents).where(eq(documents.userId, userId))
  return 12;
}

async function getIngestedCount(userId: string): Promise<number> {
  // Real: add .where(eq(documents.status, 'ingested'))
  return 9;
}

async function getQueryCount(userId: string): Promise<number> {
  // Real: return db.select({ count }).from(queries).where(eq(queries.userId, userId))
  return 47;
}

interface StatCardProps {
  label: string;
  value: number;
  description: string;
}

function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-4xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  // Promise.all fires all three queries simultaneously.
  // Sequential awaits would take A+B+C ms — parallel takes max(A,B,C) ms.
  // For three independent DB queries this is the correct pattern always.
  const [totalDocs, ingestedDocs, totalQueries] = await Promise.all([
    getDocumentCount(session!.userId),
    getIngestedCount(session!.userId),
    getQueryCount(session!.userId),
  ]);

  const failedDocs = totalDocs - ingestedDocs;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {session!.email}
        </p>
      </div>

      {/* Color swatch verification */}
      <div className="flex gap-2 p-4 mb-8">
        <div className="h-8 w-8 rounded bg-brand-500" /> {/* blue */}
        <div className="h-8 w-8 rounded bg-success-500" /> {/* green */}
        <div className="h-8 w-8 rounded bg-error-500" /> {/* red */}
        <div className="h-8 w-8 rounded bg-warning-500" /> {/* amber */}
        <div className="h-8 w-8 rounded bg-muted" /> {/* gray surface */}
        <div className="h-8 w-8 rounded bg-primary" /> {/* brand primary */}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Total Documents"
          value={totalDocs}
          description="Documents uploaded"
        />
        <StatCard
          label="Ingested"
          value={ingestedDocs}
          description="Ready to query"
        />
        <StatCard
          label="Failed"
          value={failedDocs}
          description="Ingestion failed"
        />
        <StatCard
          label="Total Queries"
          value={totalQueries}
          description="Questions asked"
        />
      </div>

      {/* Recent activity — stub */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <p className="text-sm text-gray-400">
          Recent queries and document activity will appear here.
        </p>
      </div>
    </div>
  );
}
