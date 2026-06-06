'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from './SignOutButton'
import { CommandPalette } from './CommandPalette'
import { cn } from '@/lib/cn'

/* ============================================================
   SVG icons — inline, no icon library dependency
   ============================================================ */

function IconDashboard() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="6" height="6" rx="1.5" />
      <rect x="12" y="2" width="6" height="6" rx="1.5" />
      <rect x="2" y="12" width="6" height="6" rx="1.5" />
      <rect x="12" y="12" width="6" height="6" rx="1.5" />
    </svg>
  )
}

function IconDocuments() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V7l-5-5z" />
      <path d="M11 2v5h5" />
      <line x1="7" y1="11" x2="13" y2="11" />
      <line x1="7" y1="14" x2="11" y2="14" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.43 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" />
    </svg>
  )
}

function IconAgent() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.22 3.22l1.42 1.42M15.36 15.36l1.42 1.42M3.22 16.78l1.42-1.42M15.36 4.64l1.42-1.42" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  )
}

function IconLogo() {
  return (
    <svg viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="hsl(217 91% 60%)" />
      <rect x="6" y="7" width="10" height="14" rx="2" fill="white" opacity="0.9" />
      <rect x="13" y="11" width="9" height="3" rx="1.5" fill="white" opacity="0.7" />
      <circle cx="20" cy="18" r="4" fill="hsl(217 91% 45%)" />
      <path d="M18.5 18l1 1 2-2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/documents', label: 'Documents', icon: IconDocuments },
  { href: '/chat',      label: 'Chat',      icon: IconChat      },
  { href: '/agent',     label: 'Agent',     icon: IconAgent     },
]

interface NavItemProps {
  href: string
  label: string
  icon: React.ComponentType
}

function NavItem({ href, label, icon: Icon }: NavItemProps) {
  const pathname = usePathname()
  const isActive = href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2',
        'text-sm font-medium',
        'transition-colors duration-150',
        isActive
          ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={cn('size-4 shrink-0', isActive ? 'text-brand-500 dark:text-brand-400' : '')}>
        <Icon />
      </span>
      {label}
    </Link>
  )
}

function UserAvatar({ email }: { email: string }) {
  const initials = email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

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

interface SidebarProps {
  email: string
}

export function Sidebar({ email }: SidebarProps) {
  return (
    <aside
      className="flex h-full w-56 flex-col border-r border-border bg-card"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <IconLogo />
        <span className="text-sm font-semibold tracking-tight text-foreground">DocMind</span>
      </div>

      {/* Search / command palette */}
      <div className="px-2 pb-1 pt-2">
        <CommandPalette />
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Settings + user */}
      <div className="border-t border-border p-2 space-y-0.5">
        <NavItem href="/settings" label="Settings" icon={IconSettings} />

        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 mt-1">
          <UserAvatar email={email} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{email}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  )
}
