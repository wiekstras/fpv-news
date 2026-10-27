import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Confirm subscription', robots: { index: false } }

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const payload = await getPayload({ config })
  const { docs } = token
    ? await payload.find({ collection: 'subscribers', where: { token: { equals: token } }, limit: 1 })
    : { docs: [] }
  const subscriber = docs[0]
  if (subscriber?.status === 'pending') {
    await payload.update({
      collection: 'subscribers',
      id: subscriber.id,
      data: { status: 'confirmed', confirmedAt: new Date().toISOString() },
    })
  }
  const ok = subscriber && subscriber.status !== 'unsubscribed'

  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <p className="osd text-signal">{ok ? 'ARMED' : 'NO SIGNAL'}</p>
      <h1 className="mt-2 text-3xl font-bold">{ok ? "You're subscribed!" : 'This link is not valid'}</h1>
      <p className="mt-3 text-muted">
        {ok
          ? 'The weekly digest will land in your inbox. Every email has a one-click unsubscribe link.'
          : 'It may have expired or been used to unsubscribe. You can sign up again on the homepage.'}
      </p>
      <Link href="/" className="mt-6 inline-block text-accent underline">Back to the news</Link>
    </section>
  )
}
