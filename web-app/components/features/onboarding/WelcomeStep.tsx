'use client'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: string
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <div
      className={cn(
        'group rounded-xl border border-border bg-card p-5',
        'transition-shadow duration-200 hover:shadow-md',
        'animate-in',
        delay,
      )}
    >
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

interface WelcomeStepProps {
  onNext: () => void
  onSkip: () => void
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
      {/* Progress */}
      <div className="mb-10 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === 0
                ? 'w-6 bg-brand-500'
                : 'w-1.5 bg-border',
            )}
          />
        ))}
      </div>

      {/* Logo mark */}
      <div className="mb-6 animate-in">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/20">
          <svg viewBox="0 0 32 32" fill="none" className="size-9">
            <rect x="6" y="4" width="14" height="20" rx="2.5" fill="white" opacity="0.9" />
            <rect x="17" y="10" width="10" height="3.5" rx="1.75" fill="white" opacity="0.65" />
            <circle cx="22" cy="22" r="6" fill="white" opacity="0.9" />
            <path d="M19.5 22l2 2 3-3" stroke="hsl(217 91% 50%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Heading — wide container, max 2-3 lines per gpt-taste */}
      <div className="animate-in delay-75 max-w-2xl w-full">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
          Your documents,{' '}
          <span className="text-brand-500">made conversational</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Upload any PDF and ask questions in plain English. Get precise answers with citations in seconds.
        </p>
      </div>

      {/* Feature cards — 3-column, varied but coherent, staggered */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
        <FeatureCard
          delay="delay-100"
          icon={
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6l-4-4z" />
              <path d="M9 2v4h4" />
            </svg>
          }
          title="Upload any PDF"
          description="Reports, papers, manuals, contracts. Up to 50MB per file."
        />
        <FeatureCard
          delay="delay-150"
          icon={
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 10a2 2 0 01-2 2H5l-3 3V4a2 2 0 012-2h8a2 2 0 012 2v6z" />
            </svg>
          }
          title="Ask in plain English"
          description="Get answers with exact source citations. Know where every fact comes from."
        />
        <FeatureCard
          delay="delay-200"
          icon={
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="6" r="3" />
              <path d="M2 14s1-4 6-4 6 4 6 4" />
              <path d="M12 3l1 1-2 2" />
            </svg>
          }
          title="AI that remembers"
          description="Context persists across conversations. Picks up where you left off."
        />
      </div>

      {/* CTA */}
      <div className="mt-10 flex items-center gap-3 animate-in delay-300">
        <Button
          variant="brand"
          size="lg"
          onClick={onNext}
          rightIcon={
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          }
        >
          Get started
        </Button>
      </div>

      <button
        onClick={onSkip}
        className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
      >
        Skip setup
      </button>
    </div>
  )
}
