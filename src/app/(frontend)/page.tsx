import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'
import { BuildCard } from '@/components/BuildCard'
import { NewsFeed } from '@/components/NewsFeed'
import { getFeed, getSources } from '@/lib/news/feed'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page) || 1
  const payload = await getPayload({ config })
  const [result, sources, builds] = await Promise.all([
    getFeed({ page }),
    getSources(),
    page === 1
      ? payload.find({
          collection: 'builds',
          where: { status: { equals: 'published' } },
          sort: '-publishedAt',
          limit: 3,
          depth: 1,
          overrideAccess: false,
        })
      : null,
  ])

  return (
    <>
      <section className="pb-8">
        <p className="osd text-signal">REC ● Live from the FPV world</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">FPV news, all in one feed</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Firmware releases, new gear, videos and guides from around the hobby. Short summaries, always linking to the original.
        </p>
      </section>

      {!!builds?.docs.length && (
        <section className="mb-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="osd text-muted">Fresh community builds</h2>
            <Link href="/builds" className="text-sm hover:text-accent">All builds →</Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {builds.docs.map((build) => <BuildCard key={build.id} build={build} />)}
          </div>
        </section>
      )}

      <NewsFeed result={result} basePath="/" sources={sources} />
    </>
  )
}
