import type { Payload } from 'payload'
import type { Digest, Subscriber } from '@/payload-types'
import { digestContent, SITE } from './digest'
import { renderDigest } from './render'

const BATCH_SIZE = 100 // Resend batch API limit

type Email = {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
  headers: Record<string, string>
}

const unsubscribeUrl = (token: string) => `${SITE}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
const oneClickUrl = (token: string) => `${SITE}/newsletter/one-click?token=${encodeURIComponent(token)}`

// Sends via Resend's batch endpoint; without RESEND_API_KEY the emails are only logged (local dev).
async function sendBatch(payload: Payload, emails: Email[]): Promise<(string | null)[]> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    for (const e of emails) payload.logger.info(`[newsletter dev] would send "${e.subject}" to ${e.to[0]}`)
    return emails.map(() => null)
  }
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(emails),
  })
  if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { data: { id: string }[] }
  return json.data.map((d) => d.id)
}

export async function sendDigest(payload: Payload, digestId: number, options: { testTo?: string } = {}) {
  const settings = await payload.findGlobal({ slug: 'settings' })
  const from = `${process.env.EMAIL_FROM_NAME || settings.siteName} <${process.env.EMAIL_FROM_ADDRESS || 'hello@example.com'}>`
  const digest = await payload.findByID({ collection: 'digests', id: digestId, depth: 0 })
  const content = await digestContent(payload, digest)

  const emailFor = (to: string, token: string, subject = content.subject): Email => {
    const { html, text } = renderDigest(content, { siteUrl: SITE, siteName: settings.siteName, unsubscribeUrl: unsubscribeUrl(token) })
    return {
      from,
      to: [to],
      subject,
      html,
      text,
      // RFC 8058 one-click unsubscribe, shown by Gmail/Apple Mail next to the sender.
      headers: { 'List-Unsubscribe': `<${oneClickUrl(token)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }
  }

  if (options.testTo) {
    await sendBatch(payload, [emailFor(options.testTo, 'preview', `[TEST] ${content.subject}`)])
    return { test: true, recipients: 1 }
  }

  // Claim the digest so it can never go out twice.
  const claimed = await payload.update({
    collection: 'digests',
    where: { id: { equals: digestId }, status: { equals: 'draft' } },
    data: { status: 'sending' },
  })
  if (claimed.docs.length === 0) throw new Error('This digest was already sent (or is being sent).')

  const { docs: subscribers } = await payload.find({
    collection: 'subscribers',
    where: { status: { equals: 'confirmed' } },
    pagination: false,
    depth: 0,
  })

  let sent = 0
  try {
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch: Subscriber[] = subscribers.slice(i, i + BATCH_SIZE)
      const ids = await sendBatch(payload, batch.map((s) => emailFor(s.email, s.token)))
      for (const [j, subscriber] of batch.entries()) {
        await payload.create({
          collection: 'email-events',
          data: { digest: digestId, subscriber: subscriber.id, type: 'sent', resendId: ids[j] ?? undefined },
        })
      }
      sent += batch.length
    }
  } finally {
    await payload.update({
      collection: 'digests',
      id: digestId,
      data: {
        // Nothing went out: back to draft so it can be retried. Partially sent: never resend.
        status: sent > 0 || subscribers.length === 0 ? 'sent' : 'draft',
        stats: { ...(digest.stats as Digest['stats']), sentAt: new Date().toISOString(), recipients: sent },
      },
    })
  }
  return { test: false, recipients: sent }
}
