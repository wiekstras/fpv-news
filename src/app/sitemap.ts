import config from '@payload-config'
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import { NEWS_TAGS } from '@/lib/tags'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL
  const payload = await getPayload({ config })
  const [news, sources, builds] = await Promise.all([
    payload.find({
      collection: 'news-items',
      where: { hidden: { not_equals: true } },
      sort: '-publishedAt',
      limit: 5000,
      select: { slug: true, updatedAt: true },
      depth: 0,
    }),
    payload.find({ collection: 'sources', where: { active: { equals: true } }, pagination: false, select: { slug: true } }),
    payload.find({
      collection: 'builds',
      where: { status: { equals: 'published' } },
      pagination: false,
      select: { slug: true, updatedAt: true },
      depth: 0,
    }),
  ])
  return [
    { url: `${base}/`, changeFrequency: 'hourly', priority: 1 },
    ...NEWS_TAGS.map((t) => ({ url: `${base}/news/tag/${t.value}`, changeFrequency: 'daily' as const })),
    ...sources.docs.map((s) => ({ url: `${base}/news/source/${s.slug}`, changeFrequency: 'daily' as const })),
    { url: `${base}/builds`, changeFrequency: 'daily' as const },
    ...builds.docs.map((b) => ({ url: `${base}/builds/${b.slug}`, lastModified: b.updatedAt })),
    ...news.docs.map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: n.updatedAt })),
  ]
}
