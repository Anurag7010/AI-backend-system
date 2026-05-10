import { cn } from './cn'
import type { DocumentStatus } from '../types'

// ============================================================
// BUTTON VARIANTS
// ============================================================

const buttonVariants = {
  // Base styles applied to every button regardless of variant or size
  base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',

  variants: {
    variant: {
      primary:     'bg-primary text-primary-foreground hover:bg-brand-700 active:bg-brand-800',
      secondary:   'bg-muted text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700',
      ghost:       'hover:bg-muted hover:text-foreground',
      destructive: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700',
      outline:     'border border-border bg-transparent hover:bg-muted hover:text-foreground',
      link:        'text-primary underline-offset-4 hover:underline p-0 h-auto',
    },
    size: {
      sm:   'h-8 px-3 text-xs gap-1.5',
      md:   'h-10 px-4 text-sm gap-2',
      lg:   'h-11 px-6 text-base gap-2',
      icon: 'h-10 w-10 flex-shrink-0',
    },
  },

  defaultVariants: {
    variant: 'primary' as const,
    size:    'md'      as const,
  },
}

type ButtonVariant = keyof typeof buttonVariants.variants.variant
type ButtonSize    = keyof typeof buttonVariants.variants.size

export function getButtonClasses(options: {
  variant?:  ButtonVariant
  size?:     ButtonSize
  className?: string
} = {}): string {
  const variant = options.variant ?? buttonVariants.defaultVariants.variant
  const size    = options.size    ?? buttonVariants.defaultVariants.size

  return cn(
    buttonVariants.base,
    buttonVariants.variants.variant[variant],
    buttonVariants.variants.size[size],
    options.className
  )
}

// ============================================================
// BADGE VARIANTS
// ============================================================

const badgeVariants = {
  base: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',

  variants: {
    variant: {
      success: 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-900/20 dark:text-success-400 dark:ring-success-800',
      warning: 'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:ring-warning-800',
      error:   'bg-error-50   text-error-700   ring-error-200   dark:bg-error-900/20   dark:text-error-400   dark:ring-error-800',
      neutral: 'bg-muted text-muted-foreground ring-border',
      brand:   'bg-brand-50  text-brand-700   ring-brand-200   dark:bg-brand-900/20   dark:text-brand-400   dark:ring-brand-800',
    },
  },

  defaultVariants: {
    variant: 'neutral' as const,
  },
}

type BadgeVariant = keyof typeof badgeVariants.variants.variant

export function getBadgeClasses(options: {
  variant?:   BadgeVariant
  className?: string
} = {}): string {
  const variant = options.variant ?? badgeVariants.defaultVariants.variant

  return cn(
    badgeVariants.base,
    badgeVariants.variants.variant[variant],
    options.className
  )
}

// ============================================================
// INPUT VARIANTS
// ============================================================

const inputVariants = {
  base: [
    'flex w-full rounded-md border border-input bg-background px-3 text-sm',
    'ring-offset-background',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-colors duration-fast',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ].join(' '),

  variants: {
    size: {
      sm: 'h-8 text-xs px-2',
      md: 'h-10',
      lg: 'h-12 text-base px-4',
    },
    state: {
      default: '',
      // Error state overrides the border and focus ring color
      error: 'border-error-500 focus-visible:ring-error-500',
    },
  },

  defaultVariants: {
    size:  'md'      as const,
    state: 'default' as const,
  },
}

type InputSize  = keyof typeof inputVariants.variants.size
type InputState = keyof typeof inputVariants.variants.state

export function getInputClasses(options: {
  size?:      InputSize
  state?:     InputState
  className?: string
} = {}): string {
  const size  = options.size  ?? inputVariants.defaultVariants.size
  const state = options.state ?? inputVariants.defaultVariants.state

  return cn(
    inputVariants.base,
    inputVariants.variants.size[size],
    inputVariants.variants.state[state],
    options.className
  )
}

// ============================================================
// ALERT VARIANTS
// ============================================================

const alertVariants = {
  base: 'relative rounded-lg border p-4 text-sm',

  variants: {
    variant: {
      info:    'bg-brand-50   border-brand-200   text-brand-800   dark:bg-brand-900/20   dark:border-brand-800   dark:text-brand-300',
      success: 'bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-300',
      warning: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300',
      error:   'bg-error-50   border-error-200   text-error-800   dark:bg-error-900/20   dark:border-error-800   dark:text-error-300',
    },
  },

  defaultVariants: {
    variant: 'info' as const,
  },
}

type AlertVariant = keyof typeof alertVariants.variants.variant

export function getAlertClasses(options: {
  variant?:   AlertVariant
  className?: string
} = {}): string {
  const variant = options.variant ?? alertVariants.defaultVariants.variant

  return cn(
    alertVariants.base,
    alertVariants.variants.variant[variant],
    options.className
  )
}

// ============================================================
// DOCUMENT STATUS → BADGE VARIANT MAPPING
// Record<DocumentStatus, BadgeVariant> enforces exhaustive mapping.
// If a new DocumentStatus is added (e.g. 'archived'), TypeScript will
// error here at compile time — not silently at runtime.
// This is the same exhaustive check pattern as assertNever but at the type level.
// ============================================================

export const documentStatusVariant: Record<DocumentStatus, BadgeVariant> = {
  pending:  'warning',
  ingested: 'success',
  failed:   'error',
}

// Export types for use in components
export type { ButtonVariant, ButtonSize, BadgeVariant, InputSize, InputState, AlertVariant }