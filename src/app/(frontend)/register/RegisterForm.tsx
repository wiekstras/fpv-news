'use client'

import { useActionState } from 'react'
import { register, type RegisterState } from './actions'

const input =
  'w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent'

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register, {
    ok: false,
    message: '',
  })

  if (state.ok) return <p className="rounded-md border border-accent p-4">{state.message}</p>

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="osd text-muted">Name</span>
        <input name="name" required autoComplete="name" className={input} />
      </label>
      <label className="block">
        <span className="osd text-muted">Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block">
        <span className="osd text-muted">Password (10+ characters)</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state.message && <p className="text-sm text-red-500">{state.message}</p>}
      <button
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 font-medium text-accent-fg disabled:opacity-50"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
