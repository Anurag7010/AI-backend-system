import { cn } from '@/lib/cn'

interface ActivityItem {
  id: string
  type: 'ask' | 'ingest' | 'agent'
  description: string
  createdAt: string
  metadata?: Record<string, unknown>
}

interface RecentActivityFeedProps {
  items: ActivityItem[]
  className?: string
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M14 8c0 3.314-2.686 6-6 6a6.19 6.19 0 01-2.86-.686L2 14l.936-2.186A5.981 5.981 0 012 8c0-3.314 2.686-6 6-6s6 2.686 6 6z" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M2 11.5v1.5a1 1 0 001 1h10a1 1 0 001-1V11.5M8 2v9M5 5l3-3 3 3" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M8 1v14M1 8h14M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </svg>
  )
}

const TYPE_CONFIG = {
  ask: {
    icon: <ChatIcon />,
    color: 'bg-ember/10 text-ember',
    label: 'Query',
  },
  ingest: {
    icon: <UploadIcon />,
    color: 'bg-green-500/10 text-green-600',
    label: 'Upload',
  },
  agent: {
    icon: <SparkleIcon />,
    color: 'bg-ember/10 text-ember',
    label: 'Agent',
  },
} as const

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function RecentActivityFeed({ items, className }: RecentActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <p className="text-xs text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      {items.map(item => {
        const config = TYPE_CONFIG[item.type]
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className={cn(
              'shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5',
              config.color
            )}>
              {config.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{item.description}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
            </div>
            <span className={cn(
              'shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium',
              config.color
            )}>
              {config.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
