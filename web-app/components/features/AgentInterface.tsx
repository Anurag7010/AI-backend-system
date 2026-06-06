'use client'

import { useState, useRef, useEffect } from 'react'
import { useAgent } from '@/hooks'
import { AgentStepCard } from '@/components/agent/AgentStepCard'
import { ChatInput } from '@/components/chat/ChatInput'
import { Badge, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

const SUGGESTED_QUERIES = [
  {
    label: 'List my documents',
    query: 'What documents do I have and how many chunks does each have?',
  },
  {
    label: 'Calculate from data',
    query: 'If I have 5 documents averaging 42 chunks each, how many total chunks is that?',
  },
  {
    label: 'Search + summarize',
    query: 'Search for the main conclusions in my documents and summarize them',
  },
  {
    label: 'Web + documents',
    query: 'What are the latest developments in the topic covered by my documents?',
  },
]

export default function AgentInterface() {
  const { state, steps, isRunning, run, reset } = useAgent()
  const [query, setQuery] = useState('')
  const stepsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (steps.length > 0) {
      stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [steps])

  async function handleSubmit() {
    if (!query.trim() || isRunning) return
    const q = query.trim()
    setQuery('')
    await run(q)
  }

  const hasResult = state.status === 'success' || state.status === 'error'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-brand/10 flex items-center justify-center">
                <svg viewBox="0 0 16 16" className="size-3 fill-current text-brand">
                  <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5z" />
                </svg>
              </span>
              Agent
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-step reasoning with tool use
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <div className="flex items-center gap-1.5 text-xs text-brand">
                <Spinner size="sm" />
                <span>Step {steps.length}...</span>
              </div>
            )}
            {state.status === 'success' && (
              <Badge variant="success">
                {state.data.totalSteps} step{state.data.totalSteps !== 1 ? 's' : ''}
              </Badge>
            )}
            {state.status === 'success' && state.data.stoppedReason === 'max_iterations' && (
              <Badge variant="warning">Max steps</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {steps.length === 0 && state.status === 'idle' ? (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-md w-full px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-current text-brand" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-1">Multi-step AI reasoning</h3>
              <p className="text-sm text-muted-foreground mb-5">
                The agent breaks complex tasks into steps, uses tools, and shows its full reasoning trace.
              </p>

              <div className="flex flex-wrap gap-1.5 justify-center mb-6">
                {['Search docs', 'List files', 'Calculate', 'Web search', 'Get metadata'].map((cap) => (
                  <span
                    key={cap}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                {SUGGESTED_QUERIES.map((sq) => (
                  <button
                    key={sq.label}
                    onClick={() => setQuery(sq.query)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border border-border',
                      'hover:bg-accent hover:border-brand/30 transition-all duration-150 group',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{sq.label}</span>
                      <span className="text-muted-foreground group-hover:text-brand transition-colors text-sm">→</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{sq.query}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-6 max-w-2xl mx-auto w-full">
            {/* Query recap */}
            {steps.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border">
                <p className="label-uppercase mb-1">Query</p>
                <p className="text-sm text-foreground">
                  {/* Show the thought from step 1 if available, else query */}
                  {query || (steps[0]?.actionInput ? JSON.stringify(steps[0].actionInput) : 'Running...')}
                </p>
              </div>
            )}

            {/* Reasoning trace */}
            <div>
              <p className="label-uppercase mb-4">Reasoning Trace</p>
              <div>
                {steps.map((step, i) => (
                  <AgentStepCard
                    key={step.stepNumber}
                    step={step}
                    isLast={i === steps.length - 1 && !isRunning}
                  />
                ))}

                {isRunning && (
                  <div className="flex gap-3 items-center py-2 pl-3">
                    <div className="shrink-0 w-7 h-7 rounded-full border-2 border-brand/30 bg-brand/5 flex items-center justify-center">
                      <Spinner size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground animate-pulse">Thinking...</span>
                  </div>
                )}
              </div>
            </div>

            {state.status === 'error' && (
              <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{state.error}</p>
              </div>
            )}

            {hasResult && (
              <div className="mt-6 flex gap-2">
                <button
                  onClick={reset}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  New task
                </button>
                {state.status === 'success' && (
                  <button
                    onClick={() => navigator.clipboard.writeText(state.data.answer)}
                    className="text-sm px-3 py-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    Copy answer
                  </button>
                )}
              </div>
            )}

            <div ref={stepsEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-6 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
        <ChatInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          isStreaming={isRunning}
          disabled={isRunning}
          placeholder="Give the agent a multi-step task..."
        />
      </div>
    </div>
  )
}
