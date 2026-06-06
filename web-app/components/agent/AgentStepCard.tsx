'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { AgentStep } from '@/types'

const TOOL_COLORS: Record<string, string> = {
  search_documents: 'bg-brand/10 text-brand border-brand/20',
  get_document_list: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  get_document_metadata: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  calculate: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  web_search: 'bg-green-500/10 text-green-600 border-green-500/20',
}

interface AgentStepCardProps {
  step: AgentStep
  isLast: boolean
  isAnimating?: boolean
}

export function AgentStepCard({ step, isLast, isAnimating }: AgentStepCardProps) {
  const [showFullObservation, setShowFullObservation] = useState(false)
  const [collapsed, setCollapsed] = useState(!isLast)

  const toolColor = step.action ? (TOOL_COLORS[step.action] ?? 'bg-muted text-muted-foreground border-border') : ''
  const observationPreview = step.observation ? step.observation.slice(0, 280) : null
  const hasMoreObservation = step.observation ? step.observation.length > 280 : false

  return (
    <div className={cn('relative', isAnimating && 'animate-in fade-in duration-300')}>
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-3.5 top-8 bottom-0 w-px bg-border" />
      )}

      <div className="flex gap-3">
        {/* Step indicator circle */}
        <div
          className={cn(
            'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold z-10 bg-background border-2',
            step.isFinal
              ? 'border-green-500 text-green-600'
              : 'border-border text-muted-foreground',
          )}
        >
          {step.isFinal ? '✓' : step.stepNumber}
        </div>

        {/* Step content */}
        <div className="flex-1 pb-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between py-0.5 text-left"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {step.isFinal ? (
                <span className="text-sm font-semibold text-green-600">Final Answer</span>
              ) : step.action ? (
                <>
                  <span className="text-xs text-muted-foreground">Called</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border',
                      toolColor,
                    )}
                  >
                    {step.action}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Reasoning...</span>
              )}
            </div>
            <svg
              viewBox="0 0 16 16"
              className={cn(
                'size-3.5 text-muted-foreground transition-transform duration-200 fill-none stroke-current shrink-0',
                !collapsed && 'rotate-180',
              )}
              strokeWidth="1.5"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {!collapsed && (
            <div className="mt-2 space-y-2">
              {/* Tool input */}
              {step.actionInput && Object.keys(step.actionInput).length > 0 && (
                <div className="rounded-lg bg-muted/50 border border-border overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-border">
                    <span className="label-uppercase text-[10px]">Input</span>
                  </div>
                  <pre className="px-3 py-2 text-xs font-mono overflow-x-auto text-foreground/80">
                    {JSON.stringify(step.actionInput, null, 2)}
                  </pre>
                </div>
              )}

              {/* Observation */}
              {step.observation && (
                <div className="rounded-lg bg-muted/30 border border-border overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
                    <span className="label-uppercase text-[10px]">Result</span>
                    {hasMoreObservation && (
                      <button
                        onClick={() => setShowFullObservation(!showFullObservation)}
                        className="text-[10px] text-brand hover:underline"
                      >
                        {showFullObservation ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                  <pre className="px-3 py-2 text-xs font-mono overflow-x-auto text-foreground/80 whitespace-pre-wrap">
                    {showFullObservation ? step.observation : observationPreview}
                    {!showFullObservation && hasMoreObservation && '...'}
                  </pre>
                </div>
              )}

              {/* Final answer */}
              {step.finalAnswer && (
                <div className="rounded-lg bg-green-500/5 border border-green-500/20 px-3 py-2">
                  <p className="text-sm text-foreground leading-relaxed">{step.finalAnswer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
