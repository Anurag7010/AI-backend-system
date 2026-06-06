'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { SourceCitations } from '@/components/chat/SourceCitations'
import { formatDistanceToNow } from 'date-fns'
import type { Message, Source } from '@/types'

interface MessageBubbleProps {
  message: Message
  sources?: readonly Source[]
  isStreaming?: boolean
  retrievalQuality?: {
    quality: 'good' | 'fair' | 'poor' | 'no_results'
    maxScore: number
  }
  routedTo?: 'rag' | 'agent'
  timestamp?: Date
  onCopy?: () => void
  onRegenerate?: () => void
}

export function MessageBubble({
  message,
  sources,
  isStreaming,
  retrievalQuality,
  routedTo,
  timestamp,
  onCopy,
  onRegenerate,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isWarning = message.role === 'warning'

  if (!message.content && !isStreaming) return null

  return (
    <div
      className={cn('group flex gap-3', isUser && 'flex-row-reverse')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5',
          isUser
            ? 'bg-brand text-brand-foreground'
            : isWarning
              ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
              : 'bg-muted border border-border text-muted-foreground',
        )}
      >
        {isUser ? (
          'U'
        ) : (
          <svg viewBox="0 0 16 16" className="size-3.5 fill-current">
            <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5z" />
          </svg>
        )}
      </div>

      {/* Content column */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : isWarning
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-tl-sm'
                : 'bg-card border border-border rounded-tl-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <>
              {isStreaming && !message.content ? (
                <div className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                </div>
              ) : (
                <MarkdownMessage content={message.content} />
              )}
              {isStreaming && message.content && (
                <span className="inline-block w-0.5 h-4 bg-brand ml-0.5 animate-pulse align-middle" />
              )}
            </>
          )}
        </div>

        {/* Metadata row */}
        {isAssistant && !isStreaming && (
          <div className="flex items-center gap-2 px-1 flex-wrap">
            {routedTo && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded font-mono',
                  routedTo === 'agent'
                    ? 'bg-brand/10 text-brand'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {routedTo === 'agent' ? '⚡ agent' : '🔍 rag'}
              </span>
            )}
            {retrievalQuality && retrievalQuality.quality !== 'no_results' && (
              <span
                className={cn(
                  'text-xs',
                  retrievalQuality.quality === 'good'
                    ? 'text-green-600'
                    : retrievalQuality.quality === 'fair'
                      ? 'text-yellow-600'
                      : 'text-muted-foreground',
                )}
              >
                {retrievalQuality.quality === 'good'
                  ? 'High confidence'
                  : retrievalQuality.quality === 'fair'
                    ? 'Medium confidence'
                    : 'Low confidence'}
              </span>
            )}
            {timestamp && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(timestamp, { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        {/* Action buttons on hover */}
        {isAssistant && !isStreaming && showActions && (
          <div className="flex items-center gap-1 px-1">
            {onCopy && (
              <button
                onClick={onCopy}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs"
                title="Copy response"
              >
                Copy
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs"
                title="Regenerate response"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Source citations */}
        {isAssistant && sources && sources.length > 0 && !isStreaming && (
          <SourceCitations sources={sources} className="w-full" />
        )}
      </div>
    </div>
  )
}
