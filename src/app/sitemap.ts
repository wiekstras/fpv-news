import config from '@payload-config'
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import { NEWS_TAGS } from '@/lib/tags'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const payload = await getPayload({ config })
  const [news, sources] = await Promise.all([
    payload.find({
      collection: 'news-items',
      where: { hidden: { not_equals: true } },
      sort: '-publishedAt',
      limit: 5000,
      select: { slug: true, updatedAt: true },
      depth: 0,
    }),
    payload.find({ collection: 'sources', where: { active: { equals: true } }, pagination: false, select: { slug: true } }),
  ])
  return [
    { url: `${base}/`, changeFrequency: 'hourly', priority: 1 },
    ...NEWS_TAGS.map((t) => ({ url: `${base}/news/tag/${t.value}`, changeFrequency: 'daily' as const })),
    ...sources.docs.map((s) => ({ url: `${base}/news/source/${s.slug}`, changeFrequency: 'daily' as const })),
    ...news.docs.map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: n.updatedAt })),
  ]
}
