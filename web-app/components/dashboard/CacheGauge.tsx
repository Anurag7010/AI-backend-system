'use client'

import { cn } from '@/lib/cn'

interface CacheGaugeProps {
  hitRate: number  // 0.0 – 1.0
  className?: string
}

export function CacheGauge({ hitRate, className }: CacheGaugeProps) {
  const percentage = Math.round(hitRate * 100)
  const circumference = 2 * Math.PI * 36  // radius = 36
  const strokeDashoffset = circumference - (hitRate * circumference)

  const color =
    percentage >= 70 ? 'hsl(142 76% 36%)' :
    percentage >= 40 ? 'hsl(38 92% 50%)' :
    'hsl(var(--destructive))'

  const label =
    percentage >= 70 ? 'Good' :
    percentage >= 40 ? 'Fair' : 'Poor'

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-mono leading-none">{percentage}%</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Cache hit rate</p>
    </div>
  )
}
