'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import { addComment, type CommentState, toggleLike } from '@/app/(frontend)/builds/[slug]/actions'

export function LikeButton({ buildId, initialCount, initialLiked, loggedIn, loginUrl }: {
  buildId: number
  initialCount: number
  initialLiked: boolean
  loggedIn: boolean
  loginUrl: string
}) {
  const [state, setState] = useState({ liked: initialLiked, count: initialCount })
  const [pending, start] = useTransition()
  if (!loggedIn) {
    return (
      <Link href={loginUrl} className="osd rounded-full border border-border px-3 py-1 hover:border-accent">
        ♥ {state.count} · log in to like
      </Link>
    )
  }
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={state.liked}
      onClick={() =>
        start(async () => {
          const result = await toggleLike(buildId)
          if ('liked' in result) setState(result)
        })
      }
      className={`osd rounded-full border px-3 py-1 ${state.liked ? 'border-accent bg-accent text-accent-fg' : 'border-border hover:border-accent'}`}
    >
      ♥ {state.count} {state.liked ? 'liked' : 'like'}
    </button>
  )
}

export function CommentForm({ buildId }: { buildId: number }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addComment.bind(null, buildId), { ok: false, message: '' })
  return (
    <form action={action} className="space-y-2" key={state.ok ? 'sent' : 'draft'}>
      <textarea
        name="body"
        required
        maxLength={2000}
        rows={3}
        placeholder="Questions, tips or praise for the builder…"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-md bg-accent px-4 py-2 font-medium text-accent-fg disabled:opacity-50">
          {pending ? 'Posting…' : 'Post comment'}
        </button>
        {state.message && <span className={`text-sm ${state.ok ? 'text-muted' : 'text-red-500'}`}>{state.message}</span>}
      </div>
    </form>
  )
}
