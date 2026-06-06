'use client'

import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui'

const AgentInterface = dynamic(
  () => import('@/components/features/AgentInterface'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    ),
  }
)

export default function AgentPage() {
  return (
    <div className="h-full p-6">
      <AgentInterface />
    </div>
  )
}
