import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import { unsubscribe } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } }

// A button rather than unsubscribing on page load: mail scanners open links automatically.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams
  const payload = await getPayload({ config })
  const { docs } = token ? await payload.find({ collection: 'subscribers', where: { token: { equals: token } }, limit: 1 }) : { docs: [] }
  const subscriber = docs[0]

  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      {!subscriber ? (
        <h1 className="text-3xl font-bold">This link is not valid</h1>
      ) : subscriber.status === 'unsubscribed' ? (
        <>
          <h1 className="text-3xl font-bold">You&apos;re unsubscribed</h1>
          <p className="mt-3 text-muted">You won&apos;t get any more emails from us. Sorry to see you go!</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Unsubscribe from the weekly digest?</h1>
          <p className="mt-3 text-muted">{subscriber.email}</p>
          <form action={unsubscribe} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button className="rounded-md bg-accent px-5 py-3 font-semibold text-accent-fg">Unsubscribe</button>
          </form>
        </>
      )}
    </section>
  )
}
