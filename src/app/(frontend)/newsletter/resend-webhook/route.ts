import config from '@payload-config'
import { getPayload } from 'payload'
import { verifyResendWebhook } from '@/lib/newsletter/webhook'

const TYPES: Record<string, 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
}

// Resend webhook (Dashboard → Webhooks → this URL). Records opens/clicks per digest and
// unsubscribes addresses that bounce or mark the digest as spam.
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const body = await request.text()
  if (
    !secret ||
    !verifyResendWebhook(
      secret,
      {
        id: request.headers.get('svix-id'),
        timestamp: request.headers.get('svix-timestamp'),
        signature: request.headers.get('svix-signature'),
      },
      body,
    )
  ) {
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(body) as { type: string; data: { email_id?: string; click?: { link?: string } } }
  const type = TYPES[event.type]
  if (!type || !event.data.email_id) return new Response('Ignored')

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'email-events',
    where: { resendId: { equals: event.data.email_id }, type: { equals: 'sent' } },
    limit: 1,
    depth: 0,
  })
  const sent = docs[0]
  if (!sent) return new Response('Unknown email')
  const digestId = sent.digest as number
  const subscriberId = sent.subscriber as number

  if (type === 'opened' || type === 'clicked') {
    // Stats count people, not events: only the first open/click per subscriber counts.
    const { totalDocs } = await payload.count({
      collection: 'email-events',
      where: { digest: { equals: digestId }, subscriber: { equals: subscriberId }, type: { equals: type } },
    })
    if (totalDocs === 0) {
      const digest = await payload.findByID({ collection: 'digests', id: digestId, depth: 0 })
      await payload.update({
        collection: 'digests',
        id: digestId,
        data: { stats: { ...digest.stats, [type]: (digest.stats?.[type] ?? 0) + 1 } },
      })
    }
  }
  if (type === 'bounced' || type === 'complained') {
    await payload.update({
      collection: 'subscribers',
      id: subscriberId,
      data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
    })
  }
  await payload.create({
    collection: 'email-events',
    data: { digest: digestId, subscriber: subscriberId, type, url: event.data.click?.link, resendId: event.data.email_id },
  })
  return new Response('OK')
}
