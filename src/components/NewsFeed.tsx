import Link from 'next/link'
import type { PaginatedDocs } from 'payload'
import type { NewsItem, Source } from '@/payload-types'
import { NEWS_TAGS } from '@/lib/tags'
import { NewsCard } from './NewsCard'

type Props = {
  result: PaginatedDocs<NewsItem>
  basePath: string
  sources: Pick<Source, 'id' | 'name' | 'slug'>[]
  activeTag?: string
  activeSource?: string
}

const chip = (active: boolean) =>
  `osd rounded-full border px-3 py-1 ${active ? 'border-accent bg-accent text-accent-fg' : 'border-border hover:border-accent'}`

export function NewsFeed({ result, basePath, sources, activeTag, activeSource }: Props) {
  const allActive = !activeTag && !activeSource
  return (
    <div>
      <nav aria-label="Filter by tag" className="flex flex-wrap gap-2">
        <Link href="/" className={chip(allActive)}>All</Link>
        {NEWS_TAGS.map((t) => (
          <Link key={t.value} href={`/news/tag/${t.value}`} className={chip(activeTag === t.value)}>
            {t.label}
          </Link>
        ))}
      </nav>
      {sources.length > 0 && (
        <nav aria-label="Filter by source" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="osd">Sources:</span>
          {sources.map((s) => (
            <Link
              key={s.id}
              href={`/news/source/${s.slug}`}
              className={activeSource === s.slug ? 'text-accent' : 'hover:text-fg'}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-4">
        {result.docs.length === 0 ? (
          <p className="py-16 text-center text-muted">No news here yet. Check back soon.</p>
        ) : (
          result.docs.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </div>

      {result.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
          {result.hasPrevPage ? (
            <Link href={`${basePath}?page=${result.prevPage}`} className="hover:text-accent">← Newer</Link>
          ) : <span />}
          <span className="osd text-muted">Page {result.page} / {result.totalPages}</span>
          {result.hasNextPage ? (
            <Link href={`${basePath}?page=${result.nextPage}`} className="hover:text-accent">Older →</Link>
          ) : <span />}
        </nav>
      )}
    </div>
  )
}
