import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload, type Where } from 'payload'
import { BuildCard } from '@/components/BuildCard'
import { DIFFICULTIES, FRAME_SIZES } from '@/lib/builds/options'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community builds',
  description: 'FPV drone builds from the community, with full parts lists.',
  alternates: { canonical: '/builds' },
}

type Search = { frame?: string; difficulty?: string; page?: string }

const chip = (active: boolean) =>
  `osd rounded-full border px-3 py-1 ${active ? 'border-accent bg-accent text-accent-fg' : 'border-border hover:border-accent'}`

function href(current: Search, change: Partial<Search>) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...current, page: undefined, ...change })) if (v) params.set(k, v)
  const qs = params.toString()
  return qs ? `/builds?${qs}` : '/builds'
}

export default async function BuildsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams
  const where: Where = { status: { equals: 'published' } }
  if (search.frame) where.frameSize = { equals: search.frame }
  if (search.difficulty) where.difficulty = { equals: search.difficulty }

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'builds',
    where,
    sort: '-publishedAt',
    limit: 12,
    page: Math.max(1, Number(search.page) || 1),
    depth: 1,
    overrideAccess: false,
  })

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="osd text-signal">Community</p>
          <h1 className="mt-1 text-3xl font-bold">DIY builds</h1>
          <p className="mt-2 max-w-2xl text-muted">Real quads from real pilots, with the full parts list.</p>
        </div>
        <Link href="/submit" className="rounded-md bg-accent px-4 py-2 font-medium text-accent-fg hover:opacity-90">
          Share your build
        </Link>
      </div>

      <nav aria-label="Filter by frame size" className="mt-6 flex flex-wrap gap-2">
        <Link href={href(search, { frame: undefined })} className={chip(!search.frame)}>All sizes</Link>
        {FRAME_SIZES.map((f) => (
          <Link key={f.value} href={href(search, { frame: f.value })} className={chip(search.frame === f.value)}>
            {f.value === 'whoop' ? 'Whoop' : f.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Filter by difficulty" className="mt-2 flex flex-wrap gap-2">
        <Link href={href(search, { difficulty: undefined })} className={chip(!search.difficulty)}>Any level</Link>
        {DIFFICULTIES.map((d) => (
          <Link key={d.value} href={href(search, { difficulty: d.value })} className={chip(search.difficulty === d.value)}>
            {d.label}
          </Link>
        ))}
      </nav>

      {result.docs.length === 0 ? (
        <p className="py-16 text-center text-muted">No builds match these filters yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.docs.map((build) => <BuildCard key={build.id} build={build} />)}
        </div>
      )}

      {result.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
          {result.hasPrevPage ? (
            <Link href={href(search, { page: String(result.prevPage) })} className="hover:text-accent">← Newer</Link>
          ) : <span />}
          <span className="osd text-muted">Page {result.page} / {result.totalPages}</span>
          {result.hasNextPage ? (
            <Link href={href(search, { page: String(result.nextPage) })} className="hover:text-accent">Older →</Link>
          ) : <span />}
        </nav>
      )}
    </>
  )
}
