'use client'

import { useState, useRef, useEffect } from 'react'
import { useAsk } from '@/hooks/useAsk'
import { ConversationSidebar } from '@/components/chat/ConversationSidebar'
import { MessageBubble } from '@/components/ui/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { cn } from '@/lib/cn'
import { getAccessToken } from '@/hooks'
import type { Message } from '@/types'

interface ChatInterfaceProps {
  documentId?: string
  documentName?: string
}

const SUGGESTED_QUESTIONS = [
  'What is the main topic?',
  'Summarize the key points',
  'What are the conclusions?',
]

export function ChatInterface({ documentId, documentName }: ChatInterfaceProps) {
  const [query, setQuery] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { state, messages, askStream, clearHistory, isStreaming } = useAsk()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId
    const token = getAccessToken()
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    const data: unknown = await res.json()
    const id = data && typeof data === 'object' && 'id' in data ? String(data.id) : ''
    setConversationId(id)
    return id
  }

  async function handleSubmit() {
    if (!query.trim() || isStreaming) return
    const q = query.trim()
    setQuery('')
    await ensureConversation()
    await askStream(q)
  }

  function handleNewConversation() {
    clearHistory()
    setConversationId(null)
    setQuery('')
  }

  function handleSelectConversation(id: string) {
    clearHistory()
    setConversationId(id)
  }

  const lastIndex = messages.length - 1

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation sidebar */}
      {showSidebar && (
        <div className="w-60 shrink-0 hidden md:block">
          <ConversationSidebar
            currentConversationId={conversationId ?? undefined}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground hidden md:flex"
              title="Toggle sidebar"
            >
              <svg viewBox="0 0 16 16" className="size-4 fill-none stroke-current" strokeWidth="1.5">
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <path d="M6 2v12" />
              </svg>
            </button>
            {documentName && (
              <div className="flex items-center gap-1.5 text-xs bg-brand/10 text-brand px-2.5 py-1 rounded-full">
                <svg viewBox="0 0 16 16" className="size-3 fill-current opacity-70">
                  <path d="M3 1h7l3 3v11H3V1z" />
                </svg>
                <span className="font-medium truncate max-w-[160px]">{documentName}</span>
              </div>
            )}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewConversation}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              New chat
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm px-6">
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="size-6 fill-current text-brand">
                    <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {documentName ? `Ask about "${documentName}"` : 'Ask about your documents'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {documentName
                    ? 'Get instant answers from this document'
                    : 'Upload a document and ask questions in natural language'}
                </p>
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border
                                 hover:bg-accent hover:border-brand/30 transition-all duration-150
                                 text-muted-foreground hover:text-foreground"
                    >
                      {suggestion} →
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
              {messages.map((message: Message, i: number) => {
                const isLast = i === lastIndex
                const isLastAssistant = isLast && message.role === 'assistant'
                const sources = isLastAssistant && state.status === 'success'
                  ? state.data?.sources
                  : message.sources
                const retrievalQuality = isLastAssistant && state.status === 'success'
                  ? state.data?.retrievalQuality
                  : undefined
                const routedTo = isLastAssistant && state.status === 'success'
                  ? state.data?.routedTo
                  : undefined

                return (
                  <MessageBubble
                    key={i}
                    message={message}
                    sources={sources}
                    isStreaming={isLastAssistant && isStreaming}
                    retrievalQuality={retrievalQuality}
                    routedTo={routedTo}
                    onCopy={() => navigator.clipboard.writeText(message.content)}
                    onRegenerate={
                      isLastAssistant && !isStreaming
                        ? () => {
                            const lastUserMsg = [...messages]
                              .reverse()
                              .find((m) => m.role === 'user')
                            if (lastUserMsg) askStream(lastUserMsg.content)
                          }
                        : undefined
                    }
                  />
                )
              })}

              {state.status === 'error' && !isStreaming && (
                <div
                  className={cn(
                    'flex items-center gap-2 text-sm text-destructive',
                    'bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3',
                  )}
                >
                  <span className="shrink-0">⚠</span>
                  <span>{state.error}</span>
                  <button
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
                      if (lastUserMsg) askStream(lastUserMsg.content)
                    }}
                    className="ml-auto text-xs underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              onCancel={clearHistory}
              isStreaming={isStreaming}
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Answers generated from your documents · Verify important information
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
