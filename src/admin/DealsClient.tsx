'use client'

import { Button, useAuth } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DealActions({ id, state }: { id: number; state: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function set(next: string) {
    setBusy(true)
    await fetch(`/api/listings/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: next }),
    })
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="deals__actions">
      <button disabled={busy} title="Interesting" aria-pressed={state === 'interesting'} onClick={() => set(state === 'interesting' ? 'new' : 'interesting')}>
        ★
      </button>
      <button disabled={busy} title="Ignore" aria-pressed={state === 'ignored'} onClick={() => set(state === 'ignored' ? 'new' : 'ignored')}>
        ✕
      </button>
    </div>
  )
}

export function RunDealsButton() {
  const [message, setMessage] = useState('')
  async function run() {
    const res = await fetch('/api/listings/run-now', { method: 'POST', credentials: 'include' })
    setMessage(res.ok ? 'Queued – new listings appear within a few minutes. Refresh to see them.' : 'Could not queue the run.')
  }
  return (
    <div>
      <Button buttonStyle="secondary" margin={false} onClick={run}>Run searches now</Button>
      {message && <p className="deals__muted">{message}</p>}
    </div>
  )
}

// Sidebar link to the dashboard, only for admins.
export function DealsNavLink() {
  const { user } = useAuth<{ role?: string }>()
  if (user?.role !== 'admin') return null
  return (
    <Link href="/admin/deals" className="nav__link" style={{ marginTop: 'var(--base)' }}>
      <span className="nav__link-label">📡 Deals radar</span>
    </Link>
  )
}
