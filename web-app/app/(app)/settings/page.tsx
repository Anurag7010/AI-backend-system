'use client'

import dynamic from 'next/dynamic'

const MemoryPanel = dynamic(() => import('@/components/features/MemoryPanel'), { ssr: false })

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <MemoryPanel />
    </div>
  )
}
