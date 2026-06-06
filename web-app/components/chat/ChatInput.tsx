'use client'

import { useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

const MAX_LENGTH = 2000

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  isStreaming,
  disabled,
  placeholder = 'Ask a question about your documents...',
  maxLength = MAX_LENGTH,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [value])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isStreaming && !disabled) {
        onSubmit()
      }
    }
    if (e.key === 'Escape' && isStreaming && onCancel) {
      onCancel()
    }
  }

  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.8
  const isAtLimit = charCount >= maxLength

  return (
    <div
      className={cn(
        'relative border border-input rounded-xl bg-background transition-all duration-200',
        'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
        disabled && 'opacity-60',
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={1}
        className={cn(
          'w-full resize-none bg-transparent px-4 pt-3 pb-12',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none',
          'min-h-[52px] max-h-[200px]',
        )}
      />

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
            <kbd className="kbd">↵</kbd> send
            <span className="mx-1">·</span>
            <kbd className="kbd">⇧↵</kbd> newline
          </span>
          {isStreaming && (
            <span className="text-xs text-brand animate-pulse">Generating...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isNearLimit && (
            <span
              className={cn(
                'text-xs font-mono',
                isAtLimit ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}

          {isStreaming ? (
            <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs">
              ■ Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={!value.trim() || disabled || isAtLimit}
              className="h-7 px-3"
            >
              →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
