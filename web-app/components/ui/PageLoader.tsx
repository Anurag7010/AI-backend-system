import { cn } from '@/lib/cn'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('shimmer rounded-md bg-muted', className)} aria-hidden="true" />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <Skeleton className="h-4 flex-1 max-w-48" />
              <Skeleton className="h-5 w-16 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DocumentsSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-busy="true" aria-label="Loading documents">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full" aria-busy="true" aria-label="Loading chat">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        {[80, 60, 90, 50].map((w, i) => (
          <div key={i} className={cn('flex gap-3', i % 2 !== 0 && 'flex-row-reverse')}>
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <Skeleton className={cn('h-14 rounded-2xl', `w-[${w}%] max-w-sm`)} />
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function GenericSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-3/4 max-w-sm" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
