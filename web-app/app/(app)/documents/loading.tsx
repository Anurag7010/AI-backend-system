import { SkeletonCard } from '@/components/ui/Skeleton'

export default function DocumentsLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-10 w-36 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Document list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}