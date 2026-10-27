'use client'

import { Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Result = { source: string; created?: number; skipped?: number; error?: string }

// "Fetch now" button above the Sources list: runs all active sources immediately.
export function FetchNowButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)

  async function run() {
    setBusy(true)
    try {
      const res = await fetch('/api/sources/fetch-now', { method: 'POST', credentials: 'include' })
      setResults((await res.json()).results ?? [])
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <Button buttonStyle="secondary" disabled={busy} onClick={run} margin={false}>
        {busy ? 'Fetching…' : 'Fetch all sources now'}
      </Button>
      {results && (
        <ul style={{ marginTop: 'calc(var(--base) / 2)' }}>
          {results.map((r) => (
            <li key={r.source}>
              <strong>{r.source}</strong>: {r.error ? `error – ${r.error}` : `${r.created} new, ${r.skipped} skipped`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
