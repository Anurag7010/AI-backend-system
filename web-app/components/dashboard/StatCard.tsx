import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label: string
    positive: boolean
  }
  icon?: ReactNode
  valueClassName?: string
  className?: string
}

export function StatCard({
  label,
  value,
  description,
  trend,
  icon,
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div className={cn(
      'bg-card border border-border rounded-xl p-5',
      'hover:shadow-sm transition-shadow duration-200',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </span>
        )}
      </div>
      <p className={cn(
        'text-2xl font-bold tracking-tight text-foreground',
        valueClassName
      )}>
        {value}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <span className={cn(
            'text-xs font-medium flex items-center gap-0.5',
            trend.positive ? 'text-green-600' : 'text-red-500'
          )}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}
