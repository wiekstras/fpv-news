import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import { BuildCard } from '@/components/BuildCard'
import { NewsCard } from '@/components/NewsCard'
import { searchWhere } from '@/lib/search'

export const metadata: Metadata = { title: 'Search', robots: { index: false } }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').slice(0, 100)
  const payload = await getPayload({ config })
  const newsWhere = searchWhere(q, ['title', 'summary'])
  const buildWhere = searchWhere(q, ['title', 'excerpt'])
  const [news, builds] =
    newsWhere && buildWhere
      ? await Promise.all([
          payload.find({ collection: 'news-items', where: newsWhere, sort: '-publishedAt', limit: 20, depth: 1, overrideAccess: false }),
          payload.find({
            collection: 'builds',
            where: { and: [buildWhere, { status: { equals: 'published' } }] },
            sort: '-publishedAt',
            limit: 6,
            depth: 1,
            overrideAccess: false,
          }),
        ])
      : [null, null]

  return (
    <div>
      <form action="/search" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search news and builds…"
          autoFocus
          className="w-full max-w-xl rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
        />
        <button className="rounded-md bg-accent px-4 py-2 font-medium text-accent-fg">Search</button>
      </form>
      {q && news && builds && (
        <>
          <p className="osd mt-6 text-muted">
            {news.totalDocs} news items · {builds.totalDocs} builds for “{q}”
          </p>
          {builds.docs.length > 0 && (
            <section className="mt-6">
              <h2 className="osd mb-3 text-muted">Builds</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {builds.docs.map((b) => <BuildCard key={b.id} build={b} />)}
              </div>
            </section>
          )}
          <section className="mt-8">
            {news.docs.length > 0 && <h2 className="osd text-muted">News</h2>}
            {news.docs.map((n) => <NewsCard key={n.id} item={n} />)}
          </section>
          {news.totalDocs + builds.totalDocs === 0 && <p className="py-16 text-center text-muted">Nothing found. Try fewer or other words.</p>}
        </>
      )}
    </div>
  )
}
