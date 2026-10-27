'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { subscribe, type SubscribeState } from '@/app/(frontend)/newsletter/actions'
import { CONSENT_TEXT } from '@/lib/newsletter/consent'

export function NewsletterSignup() {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribe, { ok: false, message: '' })
  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <p className="osd text-signal">Weekly digest</p>
      <h2 className="mt-1 text-xl font-bold">The week in FPV, once a week</h2>
      {state.ok ? (
        <p className="mt-3">{state.message}</p>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
            />
            <button disabled={pending} className="rounded-md bg-accent px-4 py-2 font-medium text-accent-fg disabled:opacity-50">
              {pending ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
          <label className="flex gap-2 text-sm text-muted">
            <input type="checkbox" name="consent" value="yes" required className="mt-1" />
            <span>
              {CONSENT_TEXT.replace(' Details on the privacy page.', '')}{' '}
              <Link href="/privacy" className="underline">Privacy</Link>
            </span>
          </label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          {state.message && <p className="text-sm text-red-500">{state.message}</p>}
        </form>
      )}
    </section>
  )
}
