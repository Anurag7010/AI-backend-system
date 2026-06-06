'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { cn } from '@/lib/cn'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: string
  action: () => void
  keywords?: string[]
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navigate = useCallback(
    (path: string) => {
      router.push(path)
      setOpen(false)
    },
    [router],
  )

  const COMMANDS: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: '◻',
      action: () => navigate('/dashboard'),
      keywords: ['home', 'overview', 'stats'],
    },
    {
      id: 'nav-documents',
      label: 'Go to Documents',
      icon: '📄',
      action: () => navigate('/documents'),
      keywords: ['files', 'upload', 'pdf'],
    },
    {
      id: 'nav-chat',
      label: 'New Chat',
      icon: '💬',
      action: () => navigate('/chat'),
      keywords: ['conversation', 'ask', 'question'],
    },
    {
      id: 'nav-agent',
      label: 'Open Agent',
      icon: '⚡',
      action: () => navigate('/agent'),
      keywords: ['ai', 'tool', 'multi-step', 'reasoning'],
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      icon: '⚙',
      action: () => navigate('/settings'),
      keywords: ['memory', 'account', 'preferences'],
    },
  ]

  return (
    <>
      {/* Trigger button shown in sidebar */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-xs text-muted-foreground
                   px-2 py-1.5 rounded-md hover:bg-accent hover:text-foreground
                   transition-colors w-full"
      >
        <svg viewBox="0 0 16 16" className="size-3.5 fill-none stroke-current" strokeWidth="1.5">
          <circle cx="6.5" cy="6.5" r="4" />
          <path d="M11 11l3 3" />
        </svg>
        <span>Search...</span>
        <span className="ml-auto flex items-center gap-0.5">
          <kbd className="kbd">⌘</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Palette */}
          <div className="relative z-10 max-w-lg mx-auto mt-[15vh] px-4">
            <Command
              className="rounded-xl border border-border shadow-xl bg-card overflow-hidden"
            >
              <div className="flex items-center border-b border-border px-3">
                <svg viewBox="0 0 16 16" className="size-4 text-muted-foreground shrink-0 fill-none stroke-current" strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="4" />
                  <path d="M11 11l3 3" />
                </svg>
                <Command.Input
                  placeholder="Search commands..."
                  className="flex-1 py-3 px-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                />
                <kbd className="kbd">esc</kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-1.5">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found
                </Command.Empty>

                <Command.Group
                  heading="Navigation"
                  className="[&_[cmdk-group-heading]]:label-uppercase [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  {COMMANDS.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.keywords?.join(' ')}`}
                      onSelect={cmd.action}
                      className={cn(
                        'flex items-center gap-3 px-2 py-2 rounded-lg text-sm cursor-pointer',
                        'text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground',
                        'transition-colors',
                      )}
                    >
                      <span className="shrink-0 w-5 text-center">{cmd.icon}</span>
                      <span>{cmd.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
