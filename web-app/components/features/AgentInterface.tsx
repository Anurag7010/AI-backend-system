'use client'

import { useState } from 'react'
import { useAgent } from '@/hooks'
import { Button, Input, Spinner, Badge, AsyncBoundary } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AgentStep, AgentRunResponse } from '@/types'

interface ReasoningStepProps {
  step: AgentStep
  isLast: boolean
}

function ReasoningStep({ step, isLast }: ReasoningStepProps) {
  const [expanded, setExpanded] = useState(isLast)

  return (
    <div className={cn(
      'border-l-2 pl-4 py-2',
      step.isFinal ? 'border-green-500' : 'border-blue-300'
    )}>
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-2 text-sm font-medium text-foreground w-full text-left"
      >
        <Badge variant={step.isFinal ? 'success' : 'brand'}>
          {step.isFinal ? 'Final Answer' : `Step ${step.stepNumber}`}
        </Badge>
        {step.action && (
          <span className="text-muted-foreground">→ {step.action}</span>
        )}
        <span className="ml-auto text-muted-foreground text-xs">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 text-sm">
          {step.action && step.actionInput && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Tool Input
              </p>
              <pre className="bg-muted rounded p-2 text-xs overflow-x-auto">
                {JSON.stringify(step.actionInput, null, 2)}
              </pre>
            </div>
          )}
          {step.observation && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Observation
              </p>
              <pre className="bg-muted rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                {step.observation.length > 500
                  ? step.observation.slice(0, 500) + '...'
                  : step.observation}
              </pre>
            </div>
          )}
          {step.finalAnswer && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Answer
              </p>
              <p className="text-foreground">{step.finalAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentInterface() {
  const { state, steps, isRunning, run, reset } = useAgent()
  const [query, setQuery] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || isRunning) return
    const q = query
    setQuery('')
    await run(q)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-lg font-semibold">Agent</h2>
        <p className="text-sm text-muted-foreground">
          For multi-step tasks: listing documents, calculations, comparisons
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        <AsyncBoundary<AgentRunResponse>
          state={state}
          renderLoading={() => (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Spinner size="sm" />
              <span>Agent thinking... ({steps.length} steps so far)</span>
            </div>
          )}
          renderError={(error) => (
            <div className="border border-red-500 bg-red-50 dark:bg-red-900/20 rounded p-4">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
          renderSuccess={(result) => (
            <div className="space-y-3">
              {result.steps.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">
                    Reasoning Trace ({result.totalSteps} steps)
                  </p>
                  <div className="space-y-2">
                    {result.steps.map((step, i) => (
                      <ReasoningStep
                        key={step.stepNumber}
                        step={step}
                        isLast={i === result.steps.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}
              {result.stoppedReason === 'max_iterations' && (
                <Badge variant="warning">
                  Reached maximum steps — answer may be incomplete
                </Badge>
              )}
            </div>
          )}
          renderIdle={() => (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Ask a multi-step question to see the agent reason through it
            </div>
          )}
        />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="How many documents do I have? Calculate the total pages..."
          disabled={isRunning}
          fullWidth
        />
        <Button
          type="submit"
          disabled={!query.trim() || isRunning}
          loading={isRunning}
        >
          Run
        </Button>
        {state.status !== 'idle' && (
          <Button variant="ghost" onClick={reset} disabled={isRunning}>
            Clear
          </Button>
        )}
      </form>
    </div>
  )
}
