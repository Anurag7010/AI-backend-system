import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AppShell } from '@/components/features/AppShell'
import type { ReactNode } from 'react'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return <AppShell email={session.email}>{children}</AppShell>
}
