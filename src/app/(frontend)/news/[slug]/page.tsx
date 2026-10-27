import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'
import { NewsCard, tagLabel, thumbnailLabel } from '@/components/NewsCard'
import { Thumbnail } from '@/components/Thumbnail'
import { formatDate } from '@/lib/news/feed'
import type { Source } from '@/payload-types'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const getItem = cache(async (slug: string) => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'news-items',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  return docs[0]
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getItem((await params).slug)
  if (!item) return {}
  const description = item.summary || `${item.title} – via ${(item.source as Source).name}`
  return {
    title: item.title,
    description,
    alternates: { canonical: `/news/${item.slug}` },
    openGraph: {
      type: 'article',
      title: item.title,
      description,
      publishedTime: item.publishedAt,
      images: item.thumbnailUrl ? [item.thumbnailUrl] : undefined,
    },
  }
}

export default async function NewsItemPage({ params }: Props) {
  const item = await getItem((await params).slug)
  if (!item) notFound()
  const source = item.source as Source

  const payload = await getPayload({ config })
  const more = await payload.find({
    collection: 'news-items',
    where: { source: { equals: source.id }, id: { not_equals: item.id } },
    sort: '-publishedAt',
    limit: 4,
    depth: 1,
    overrideAccess: false,
  })

  return (
    <article className="mx-auto max-w-3xl">
      <p className="osd text-muted">
        <Link href={`/news/source/${source.slug}`} className="text-signal hover:underline">{source.name}</Link>
        <span> · {formatDate(item.publishedAt)}</span>
      </p>
      <h1 className="mt-2 text-3xl leading-tight font-bold sm:text-4xl">{item.title}</h1>

      <Thumbnail src={item.thumbnailUrl} label={thumbnailLabel(source)} className="mt-6 aspect-video w-full rounded-lg" />

      {item.summary ? (
        <p className="mt-6 text-lg">{item.summary}</p>
      ) : (
        <p className="mt-6 text-muted">We link to the original rather than republishing it. Read the full story at the source.</p>
      )}

      <a
        href={item.url}
        target="_blank"
        rel="noopener"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 font-semibold text-accent-fg hover:opacity-90"
      >
        Read the full story on {source.name} ↗
      </a>

      {!!item.tags?.length && (
        <ul className="mt-6 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <li key={tag}>
              <Link href={`/news/tag/${tag}`} className="osd rounded border border-border px-2 py-1 hover:border-accent">
                {tagLabel(tag)}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {more.docs.length > 0 && (
        <section className="mt-12">
          <h2 className="osd text-muted">More from {source.name}</h2>
          {more.docs.map((doc) => <NewsCard key={doc.id} item={doc} />)}
        </section>
      )}
    </article>
  )
}
