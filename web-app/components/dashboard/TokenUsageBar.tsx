'use client'

import { cn } from '@/lib/cn'

interface TokenUsageBarProps {
  used: number
  budget: number
  estimatedCost: number
  className?: string
}

export function TokenUsageBar({ used, budget, estimatedCost, className }: TokenUsageBarProps) {
  const percentage = Math.min((used / budget) * 100, 100)
  const remaining = Math.max(budget - used, 0)

  const barColor =
    percentage >= 90 ? 'bg-red-500' :
    percentage >= 70 ? 'bg-yellow-500' :
    'bg-brand'

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily Token Usage</p>
        <span className="text-xs font-mono text-muted-foreground">
          ${estimatedCost.toFixed(4)} est.
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-mono font-medium text-foreground">{used.toLocaleString()}</span> used
        </span>
        <span>
          <span className="font-mono font-medium text-foreground">{remaining.toLocaleString()}</span> remaining
        </span>
      </div>
    </div>
  )
}
