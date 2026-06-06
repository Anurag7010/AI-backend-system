'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import { getAccessToken } from '@/hooks'

interface ConversationItem {
  id: string
  title: string
  updatedAt: Date | string
}

interface ConversationSidebarProps {
  currentConversationId?: string
  onSelect: (id: string) => void
  onNew: () => void
  className?: string
}

export function ConversationSidebar({
  currentConversationId,
  onSelect,
  onNew,
  className,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const token = getAccessToken()
      const res = await fetch('/api/conversations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data: unknown = await res.json()
        if (data && typeof data === 'object' && 'conversations' in data && Array.isArray(data.conversations)) {
          setConversations(data.conversations as ConversationItem[])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const groups = groupByDate(conversations)

  return (
    <div className={cn('flex flex-col h-full border-r border-border bg-card/50', className)}>
      <div className="p-3 border-b border-border">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                     bg-primary text-primary-foreground hover:bg-primary/90
                     transition-colors active:scale-[0.98]"
        >
          <svg viewBox="0 0 16 16" className="size-4 fill-current">
            <path d="M8 3v10M3 8h10" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg shimmer" />
          ))
        ) : conversations.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          Object.entries(groups).map(([group, convos]) => (
            <div key={group}>
              <p className="label-uppercase px-2 mb-1">{group}</p>
              <div className="space-y-0.5">
                {convos.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => onSelect(convo.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      'hover:bg-accent flex items-start gap-2',
                      currentConversationId === convo.id
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5 mt-0.5 shrink-0 opacity-60 fill-none stroke-current" strokeWidth="1.2">
                      <path d="M2 3h12v9H9l-3 2v-2H2z" />
                    </svg>
                    <span className="truncate flex-1">{convo.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function groupByDate(conversations: ConversationItem[]): Record<string, ConversationItem[]> {
  const groups: Record<string, ConversationItem[]> = {}

  conversations.forEach((convo) => {
    const date = new Date(convo.updatedAt)
    const group = isToday(date)
      ? 'Today'
      : isYesterday(date)
        ? 'Yesterday'
        : isThisWeek(date)
          ? 'This week'
          : 'Older'

    if (!groups[group]) groups[group] = []
    groups[group].push(convo)
  })

  return groups
}
