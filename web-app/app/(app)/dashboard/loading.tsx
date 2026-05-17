import { SkeletonCard } from "@/components/ui/Skeleton";
import { SkeletonText } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Recent activity skeleton */}
      <div className="card p-6 space-y-4">
        <div className="h-6 w-36 rounded-md bg-muted animate-pulse" />
        <SkeletonText lines={5} />
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
