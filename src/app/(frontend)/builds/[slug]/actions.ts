'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { rateLimit } from '@/lib/rateLimit'
import { SITE_URL } from '@/lib/site'

async function currentUser() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return { payload, user }
}

export type CommentState = { ok: boolean; message: string }

export async function addComment(buildId: number, _prev: CommentState, form: FormData): Promise<CommentState> {
  const { payload, user } = await currentUser()
  if (!user) return { ok: false, message: 'Log in to comment.' }
  if (!rateLimit(`comment:${user.id}`, 10, 60 * 60 * 1000)) return { ok: false, message: 'You are commenting a lot; try again later.' }
  const body = String(form.get('body') || '').trim()
  if (body.length < 2) return { ok: false, message: 'Write a comment first.' }
  if (body.length > 2000) return { ok: false, message: 'Keep it under 2000 characters.' }

  // Read server-side (the commenter can't read the author's account); only published builds take comments.
  const build = await payload.findByID({ collection: 'builds', id: buildId, depth: 1, overrideAccess: true })
  if (build.status !== 'published') return { ok: false, message: 'Comments are only possible on published builds.' }
  await payload.create({
    collection: 'comments',
    data: { build: build.id, author: user.id, authorName: user.name, body },
    overrideAccess: true,
  })

  const author = typeof build.author === 'object' ? build.author : null
  if (author?.email && author.id !== user.id) {
    await payload
      .sendEmail({
        to: author.email,
        subject: `New comment on "${build.title}"`,
        text: `${user.name} wrote:\n\n${body}\n\n${SITE_URL}/builds/${build.slug}#comments`,
      })
      .catch((err: unknown) => payload.logger.warn({ err }, 'Comment notification failed'))
  }
  revalidatePath(`/builds/${build.slug}`)
  return { ok: true, message: 'Thanks! Your comment is posted.' }
}

export async function toggleLike(buildId: number): Promise<{ liked: boolean; count: number } | { error: string }> {
  const { payload, user } = await currentUser()
  if (!user) return { error: 'Log in to like builds.' }
  const { docs } = await payload.find({
    collection: 'likes',
    where: { build: { equals: buildId }, user: { equals: user.id } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) await payload.delete({ collection: 'likes', id: docs[0].id })
  else await payload.create({ collection: 'likes', data: { build: buildId, user: user.id } })
  const { totalDocs } = await payload.count({ collection: 'likes', where: { build: { equals: buildId } } })
  return { liked: !docs[0], count: totalDocs }
}
