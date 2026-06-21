'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui'
import { getAccessToken } from '@/hooks/useAuth'

const MemoryPanel = dynamic(() => import('@/components/features/MemoryPanel'), { ssr: false })

type SettingsTab = 'account' | 'memory' | 'usage' | 'danger'

const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'memory', label: 'Memory' },
  { id: 'usage', label: 'Usage' },
  { id: 'danger', label: 'Danger Zone' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account, memory, and data</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              'border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-ember text-parchment'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'account' && <AccountTab />}
      {activeTab === 'memory' && <MemoryPanel />}
      {activeTab === 'usage' && <UsageTab />}
      {activeTab === 'danger' && <DangerTab />}
    </div>
  )
}

function AccountTab() {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Account Information</h3>
        <div className="space-y-0">
          {[
            { label: 'Plan', value: 'Free' },
            { label: 'Account type', value: 'Developer' },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2.5 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-1">Export Your Data</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Download all your queries and conversations as JSON
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const token = getAccessToken()
            const res = await fetch('/api/export', {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (res.ok) {
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'docmind-export.json'
              a.click()
              URL.revokeObjectURL(url)
            }
          }}
        >
          Download JSON export
        </Button>
      </div>
    </div>
  )
}

function UsageTab() {
  const [stats, setStats] = useState<Record<string, number | string>>({})

  useEffect(() => {
    const token = getAccessToken()
    fetch('/api/dashboard/stats', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setStats({
            'Queries today': data.queries?.last24h ?? 0,
            'Documents uploaded': data.documents?.total ?? 0,
            'Documents ingested': data.documents?.ingested ?? 0,
            'Failed documents': data.documents?.failed ?? 0,
          })
        }
      })
      .catch(() => {/* non-fatal */})
  }, [])

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Usage Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(stats).length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 animate-pulse h-16" />
            ))
          ) : (
            Object.entries(stats).map(([label, value]) => (
              <div key={label} className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold font-mono mt-1">{value}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function DangerTab() {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h3>
        <p className="text-xs text-red-600/80 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>
        <div className="space-y-0">
          <div className="flex items-center justify-between py-3 border-b border-red-200/60">
            <div>
              <p className="text-sm font-medium text-foreground">Delete all documents</p>
              <p className="text-xs text-muted-foreground">Remove all uploaded PDFs and their chunks</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
            >
              Delete documents
            </Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="destructive" size="sm">Confirm delete</Button>
              </div>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                Delete account
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
