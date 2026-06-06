'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from './SignOutButton'
import { cn } from '@/lib/cn'

function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="size-5">
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="17" y2="14" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="size-5">
      <line x1="4" y1="4" x2="16" y2="16" />
      <line x1="16" y1="4" x2="4" y2="16" />
    </svg>
  )
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/documents', label: 'Documents' },
  { href: '/chat',      label: 'Chat'      },
  { href: '/agent',     label: 'Agent'     },
  { href: '/search',    label: 'Search'    },
  { href: '/settings',  label: 'Settings'  },
]

function UserAvatar({ email }: { email: string }) {
  const initials = email.split('@')[0].slice(0, 2).toUpperCase()
  const hue = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="size-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ background: `hsl(${hue} 60% 45%)` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

export function MobileSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Top bar — visible on mobile */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="size-6">
            <rect width="24" height="24" rx="6" fill="hsl(217 91% 60%)" />
            <rect x="5" y="5.5" width="8.5" height="12" rx="1.5" fill="white" opacity="0.9" />
            <rect x="11" y="8.5" width="7" height="2.5" rx="1.25" fill="white" opacity="0.7" />
            <circle cx="17" cy="16" r="3.5" fill="hsl(217 91% 45%)" />
            <path d="M15.8 16l1 1 1.5-1.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-semibold tracking-tight">PrometheonAI</span>
        </div>

        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <IconMenu />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border',
          'flex flex-col transition-transform duration-300 ease-out',
          'lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="size-6 shrink-0">
              <rect width="24" height="24" rx="6" fill="hsl(217 91% 60%)" />
              <path d="M12 4c0 0-3.5 3.5-3.5 7 0 2 1.2 3.2 1.2 3.2s-.4-1.6.8-3c.4 1.6 1.6 2.8 1.6 4.5.8-.8 1.2-2 1.2-3.2.8 1.2.8 2.8.8 2.8s1.6-1.6 1.6-3.8c0-2.4-1.6-4.5-1.6-4.5s.4 2.4-1.2 3.2C12.4 7.5 12 4 12 4z" fill="white" opacity="0.95" />
              <circle cx="12" cy="18.5" r="1.2" fill="white" opacity="0.6" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">PrometheonAI</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <IconClose />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map(({ href, label }) => {
            const isActive = href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <UserAvatar email={email} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </>
  )
}
