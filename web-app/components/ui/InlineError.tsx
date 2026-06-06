import { cn } from '@/lib/cn'
import { Button } from './Button'

interface InlineErrorProps {
  title?: string
  message: string
  onRetry?: () => void
  variant?: 'error' | 'warning'
  className?: string
}

export function InlineError({
  title,
  message,
  onRetry,
  variant = 'error',
  className,
}: InlineErrorProps) {
  const isError = variant === 'error'

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 py-8 px-6 text-center rounded-xl border',
        isError
          ? 'border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-900/10'
          : 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/10',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center size-10 rounded-full',
          isError
            ? 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400'
            : 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
        )}
        aria-hidden="true"
      >
        {isError ? (
          <svg className="size-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="10" cy="10" r="8" />
            <path d="M10 6v4M10 14h.01" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="size-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M10 2L2 17h16L10 2z" strokeLinejoin="round" />
            <path d="M10 8v4M10 14h.01" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <div className="space-y-1">
        {title && (
          <p className={cn(
            'text-sm font-semibold',
            isError ? 'text-error-800 dark:text-error-300' : 'text-warning-800 dark:text-warning-300',
          )}>
            {title}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1"
        >
          Try again
        </Button>
      )}
    </div>
  )
}
