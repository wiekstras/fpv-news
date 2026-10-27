'use client'

import { Button, useAuth, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Shown on a digest's edit page: email preview, test send and the real send.
export function DigestActions() {
  const { id } = useDocumentInfo()
  const { user } = useAuth<{ email: string }>()
  const status = useFormFields(([fields]) => fields.status?.value as string | undefined)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [previewKey, setPreviewKey] = useState(0)

  if (!id) return <p>Save the digest to see the preview and send options.</p>

  async function send(test: boolean) {
    if (!test && !window.confirm('Send this digest to all confirmed subscribers now? This cannot be undone.')) return
    setBusy(true)
    setMessage('')
    const res = await fetch(`/api/digests/${id}/send`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ test }),
    })
    const json = await res.json()
    setBusy(false)
    setMessage(res.ok ? (test ? `Test sent to ${user?.email}.` : `Sent to ${json.recipients} subscribers.`) : `Error: ${json.error}`)
    if (!test) router.refresh()
  }

  return (
    <div style={{ marginBottom: 'calc(var(--base) * 2)' }}>
      <div style={{ display: 'flex', gap: 'var(--base)', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button buttonStyle="secondary" margin={false} onClick={() => setPreviewKey((k) => k + 1)}>Refresh preview</Button>
        <Button buttonStyle="secondary" margin={false} disabled={busy} onClick={() => send(true)}>Send test to me</Button>
        {status === 'draft' && (
          <Button margin={false} disabled={busy} onClick={() => send(false)}>Send to subscribers</Button>
        )}
        {status && status !== 'draft' && <strong>Status: {status}</strong>}
      </div>
      {message && <p>{message}</p>}
      <p style={{ color: 'var(--theme-elevation-500)' }}>Preview shows the last saved version: save your edits, then refresh.</p>
      <iframe
        key={previewKey}
        title="Digest preview"
        src={`/newsletter/preview/${id}`}
        style={{ width: '100%', height: 720, border: '1px solid var(--theme-elevation-150)', borderRadius: 6, background: '#fff' }}
      />
    </div>
  )
}

// Above the Digests list: build this week's draft now instead of waiting for the schedule.
export function GenerateDigestButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true)
    const res = await fetch('/api/digests/generate', { method: 'POST', credentials: 'include' })
    const json = await res.json()
    setBusy(false)
    if (res.ok) router.push(`/admin/collections/digests/${json.id}`)
  }
  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <Button buttonStyle="secondary" margin={false} disabled={busy} onClick={run}>
        {busy ? 'Building…' : 'Build a draft from the last 7 days'}
      </Button>
    </div>
  )
}
