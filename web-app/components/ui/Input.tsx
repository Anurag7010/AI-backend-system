import React from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
  fullWidth?: boolean
  containerClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      helperText,
      size = 'md',
      leftElement,
      rightElement,
      fullWidth = false,
      className,
      containerClassName,
      id,
      name,
      ...props
    },
    ref,
  ) {
    const inputId = id ?? (name ? `input-${name}` : undefined)
    const errorId = inputId ? `${inputId}-error` : undefined
    const helperId = inputId ? `${inputId}-helper` : undefined
    const describedBy = error ? errorId : helperText ? helperId : undefined

    const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
      sm: 'h-8 text-xs px-2.5',
      md: 'h-9 text-sm px-3',
      lg: 'h-11 text-base px-4',
    }

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground leading-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftElement && (
            <span className="absolute left-3 flex items-center text-muted-foreground pointer-events-none [&>svg]:size-4">
              {leftElement}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              'flex w-full rounded-md border bg-background',
              'text-foreground placeholder:text-muted-foreground',
              'transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              error
                ? 'border-destructive focus-visible:ring-destructive/20'
                : 'border-input',
              sizeClasses[size],
              leftElement && 'pl-9',
              rightElement && 'pr-9',
              fullWidth && 'w-full',
              className,
            )}
            {...props}
          />

          {rightElement && (
            <span className="absolute right-3 flex items-center text-muted-foreground pointer-events-none [&>svg]:size-4">
              {rightElement}
            </span>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
            <svg className="size-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm0 9.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.25a.75.75 0 01-1.5 0v-3a.75.75 0 011.5 0v3z"/>
            </svg>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)
