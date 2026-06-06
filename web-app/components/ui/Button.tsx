'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

export type ButtonVariant =
  | 'primary'      // dark fill — primary actions (same as 'default')
  | 'default'      // alias for primary
  | 'brand'        // electric blue — AI / key moments
  | 'secondary'    // muted fill
  | 'ghost'        // no background
  | 'outline'      // border only
  | 'destructive'  // red — dangerous actions
  | 'link'         // text link style

export type ButtonSize = 'sm' | 'md' | 'default' | 'lg' | 'icon' | 'icon-sm'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  asChild?: boolean
}

const base = [
  'inline-flex items-center justify-center gap-2',
  'font-medium text-sm',
  'rounded-md',
  'whitespace-nowrap select-none',
  'transition-all duration-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
  'disabled:pointer-events-none disabled:opacity-50',
  'active:scale-[0.98]',
].join(' ')

const variants: Record<ButtonVariant, string> = {
  primary:     'bg-primary text-primary-foreground hover:opacity-90 shadow-xs',
  default:     'bg-primary text-primary-foreground hover:opacity-90 shadow-xs',
  brand:       'bg-brand-500 text-white hover:bg-brand-600 shadow-xs',
  secondary:   'bg-secondary text-secondary-foreground hover:bg-accent',
  ghost:       'hover:bg-accent hover:text-accent-foreground',
  outline:     'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-xs',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-xs',
  link:        'text-brand-500 underline-offset-4 hover:underline p-0 h-auto font-normal',
}

const sizes: Record<ButtonSize, string> = {
  sm:       'h-8 px-3 text-xs',
  md:       'h-9 px-4',
  default:  'h-9 px-4',
  lg:       'h-11 px-6 text-base',
  icon:     'h-9 w-9',
  'icon-sm':'h-7 w-7 text-xs',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size="sm" className="shrink-0" />
            <span className="opacity-70">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0 [&>svg]:size-4" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0 [&>svg]:size-4" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  },
)
