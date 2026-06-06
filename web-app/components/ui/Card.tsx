import { cn } from '@/lib/cn'

type Elevation = 0 | 1 | 2

interface CardRootProps {
  className?: string
  children: React.ReactNode
  elevation?: Elevation
  interactive?: boolean
  onClick?: () => void
}

const elevationClasses: Record<Elevation, string> = {
  0: 'shadow-none',
  1: 'shadow-sm',
  2: 'shadow-md',
}

function CardRoot({
  className,
  children,
  elevation = 1,
  interactive = false,
  onClick,
}: CardRootProps) {
  const base = cn(
    'bg-card text-card-foreground rounded-xl border border-border',
    elevationClasses[elevation],
    interactive && [
      'cursor-pointer',
      'transition-shadow duration-200',
      'hover:shadow-md',
      'active:scale-[0.995]',
    ],
    className,
  )

  if (interactive && onClick) {
    return (
      <div className={base} onClick={onClick} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}>
        {children}
      </div>
    )
  }

  return <div className={base}>{children}</div>
}

interface CardSubProps {
  className?: string
  children: React.ReactNode
}

function CardHeader({ className, children }: CardSubProps) {
  return (
    <div className={cn('flex flex-col gap-1 p-5 border-b border-border', className)}>
      {children}
    </div>
  )
}

function CardTitle({ className, children }: CardSubProps) {
  return (
    <h3 className={cn('text-base font-semibold text-foreground leading-tight tracking-tight', className)}>
      {children}
    </h3>
  )
}

function CardDescription({ className, children }: CardSubProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  )
}

function CardContent({ className, children }: CardSubProps) {
  return <div className={cn('p-5', className)}>{children}</div>
}

function CardFooter({ className, children }: CardSubProps) {
  return (
    <div className={cn('flex items-center gap-3 px-5 py-4 border-t border-border', className)}>
      {children}
    </div>
  )
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
})

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
