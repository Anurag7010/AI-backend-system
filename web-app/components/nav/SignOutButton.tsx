'use client'

import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      aria-label="Sign out"
      title="Sign out"
      className="shrink-0 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" />
        <polyline points="10,10 14,8 10,6" />
        <line x1="14" y1="8" x2="6" y2="8" />
      </svg>
    </button>
  )
}
