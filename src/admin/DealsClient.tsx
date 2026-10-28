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

type Found = {
  source: string
  externalId: string
  title: string
  price: number | null
  currency: string
  priceEur: number | null
  discountPct: number | null
  location?: string
  country: string
  url: string
  image?: string
}
type SearchResponse = {
  listings: Found[]
  perSource: { source: string; found?: number; error?: string }[]
  reference: number | null
  error?: string
}

const eur = (v: number | null) => (v == null ? '–' : `€${Math.round(v)}`)

// "Search all platforms now": a one-off search across the enabled sources, nothing stored.
export function DealsSearch({ sources }: { sources: { value: string; label: string }[] }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [last, setLast] = useState<Record<string, unknown> | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function run(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const num = (k: string) => (form.get(k) ? Number(form.get(k)) : undefined)
    const body = {
      keywords: String(form.get('keywords') || ''),
      minPrice: num('minPrice'),
      maxPrice: num('maxPrice'),
      referencePrice: num('referencePrice'),
      excludeKeywords: String(form.get('excludeKeywords') || ''),
      countries: String(form.get('countries') || '')
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
      sources: form.getAll('sources').map(String),
    }
    setBusy(true)
    setResult(null)
    setSaved(null)
    setLast(body)
    const res = await fetch('/api/listings/search', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setResult(await res.json())
    setBusy(false)
  }

  async function save() {
    if (!last) return
    const res = await fetch('/api/saved-searches', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...last, name: String(last.keywords), active: true }),
    })
    const json = await res.json()
    setSaved(res.ok ? `/admin/collections/saved-searches/${json.doc.id}` : null)
  }

  return (
    <section className="deals__search-all">
      <h2>Search all platforms now</h2>
      <form onSubmit={run} className="deals__filters">
        <input name="keywords" placeholder="e.g. DJI O3 air unit" required style={{ minWidth: 220 }} />
        <input name="minPrice" type="number" placeholder="Min €" />
        <input name="maxPrice" type="number" placeholder="Max €" />
        <input name="countries" placeholder="Countries, e.g. NL,DE (empty = all)" style={{ minWidth: 200 }} />
        <input name="excludeKeywords" placeholder="Exclude words" />
        <input name="referencePrice" type="number" placeholder="New price € (optional)" style={{ width: 150 }} />
        <span className="deals__sources">
          {sources.map((s) => (
            <label key={s.value}>
              <input type="checkbox" name="sources" value={s.value} defaultChecked /> {s.label}
            </label>
          ))}
        </span>
        <button type="submit" disabled={busy || sources.length === 0}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      {sources.length === 0 && <p className="deals__muted">Enable sources in Settings → Deals first.</p>}
      {busy && <p className="deals__muted">Searching {sources.length} platforms. Each site is queried politely, so this can take a minute.</p>}
      {result?.error && <p>{result.error}</p>}
      {result && !result.error && (
        <>
          <p className="deals__muted">
            {result.perSource.map((p) => `${p.source}: ${p.error ? `error – ${p.error}` : `${p.found} found`}`).join(' · ')}
            {result.reference ? ` · new price ≈ €${result.reference}` : ''}
          </p>
          <p>
            <strong>{result.listings.length}</strong> matching listings{' '}
            <button type="button" onClick={save}>Save as saved search</button>{' '}
            {saved && <a href={saved}>Saved – edit alerts</a>}
          </p>
          <table className="deals__table">
            <tbody>
              {result.listings.map((l) => (
                <tr key={`${l.source}-${l.externalId}`}>
                  <td>{l.image ? <img src={l.image} alt="" referrerPolicy="no-referrer" loading="lazy" /> : null}</td>
                  <td>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
                    <div className="deals__muted">{l.source}</div>
                  </td>
                  <td>
                    <strong>{eur(l.priceEur)}</strong>
                    {l.currency !== 'EUR' && l.price != null && <div className="deals__muted">{l.price} {l.currency}</div>}
                  </td>
                  <td>
                    {l.discountPct != null && (
                      <span className={`deals__discount ${l.discountPct >= 30 ? 'is-great' : l.discountPct < 0 ? 'is-worse' : ''}`}>
                        {l.discountPct > 0 ? `−${l.discountPct}%` : `+${-l.discountPct}%`}
                      </span>
                    )}
                  </td>
                  <td>
                    {l.country}
                    {l.location && <div className="deals__muted">{l.location}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
