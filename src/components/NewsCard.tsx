import Link from 'next/link'
import type { NewsItem, Source } from '@/payload-types'
import { formatDate } from '@/lib/news/feed'
import { NEWS_TAGS } from '@/lib/tags'
import { Thumbnail } from './Thumbnail'

const TYPE_LABEL: Record<Source['type'], string> = { rss: 'NEWS', youtube: 'VIDEO', github: 'FIRMWARE', blog: 'BLOG' }

export function tagLabel(value: string) {
  return NEWS_TAGS.find((t) => t.value === value)?.label ?? value
}

export function thumbnailLabel(source?: Source) {
  return source ? TYPE_LABEL[source.type] : 'NEWS'
}

export function NewsCard({ item }: { item: NewsItem }) {
  const source = typeof item.source === 'object' ? item.source : undefined
  return (
    <article className="group flex gap-4 border-b border-border py-5">
      <Link href={`/news/${item.slug}`} className="shrink-0" tabIndex={-1} aria-hidden>
        <Thumbnail src={item.thumbnailUrl} label={thumbnailLabel(source)} className="aspect-video w-28 rounded-md sm:w-48" />
      </Link>
      <div className="min-w-0">
        <p className="osd text-muted">
          {source && (
            <Link href={`/news/source/${source.slug}`} className="text-signal hover:underline">
              {source.name}
            </Link>
          )}
          <span> · {formatDate(item.publishedAt)}</span>
        </p>
        <h2 className="mt-1 text-lg leading-snug font-semibold group-hover:text-accent">
          <Link href={`/news/${item.slug}`}>{item.title}</Link>
        </h2>
        {item.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p>}
        {!!item.tags?.length && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <li key={tag}>
                <Link href={`/news/tag/${tag}`} className="osd rounded border border-border px-1.5 py-0.5 hover:border-accent">
                  {tagLabel(tag)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
