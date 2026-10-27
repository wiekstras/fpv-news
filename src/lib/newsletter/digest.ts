import type { Payload } from 'payload'
import type { Build, Digest, Media, NewsItem, Source } from '@/payload-types'
import { DIFFICULTIES, FRAME_SIZES, optionLabel } from '../builds/options'
import { pickNews } from './pick'
import type { DigestContent, DigestEntry } from './render'
import { TZ } from './schedule'

export const SITE = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

const buildMeta = (b: Build) =>
  [optionLabel(FRAME_SIZES, b.frameSize), optionLabel(DIFFICULTIES, b.difficulty), b.authorName && `by ${b.authorName}`]
    .filter(Boolean)
    .join(' · ')

const photo = (b: Build) => {
  const p = b.photos?.[0] as Media | undefined
  return p ? (p.sizes?.large?.url ?? p.url) : null
}

// Creates the weekly draft: up to 8 news items from the last 7 days (max 2 per source),
// the newest build of the week as featured, and up to 3 more builds.
export async function createDigestDraft(payload: Payload, scheduledAt: Date) {
  const since = new Date(scheduledAt.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [news, builds] = await Promise.all([
    payload.find({
      collection: 'news-items',
      where: { publishedAt: { greater_than: since }, hidden: { not_equals: true } },
      sort: '-publishedAt',
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'builds',
      where: { status: { equals: 'published' }, publishedAt: { greater_than: since } },
      sort: '-publishedAt',
      limit: 4,
      depth: 0,
    }),
  ])
  const [featured, ...moreBuilds] = builds.docs
  const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(scheduledAt)

  return payload.create({
    collection: 'digests',
    data: {
      subject: `FPV weekly · ${date}`,
      weekOf: scheduledAt.toISOString(),
      status: 'draft',
      intro: 'Here is what happened in FPV this week: firmware, gear, videos and the best community builds.',
      featuredBuild: featured?.id,
      items: [
        ...pickNews(news.docs).map((n) => ({ kind: 'news' as const, newsItem: n.id })),
        ...moreBuilds.map((b) => ({ kind: 'build' as const, build: b.id })),
      ],
    },
  })
}

// Loads everything a digest references and turns it into renderable content.
export async function digestContent(payload: Payload, digest: Digest): Promise<DigestContent> {
  const full = await payload.findByID({ collection: 'digests', id: digest.id, depth: 2 })
  const entries: DigestEntry[] = []
  for (const item of full.items ?? []) {
    if (item.kind === 'news' && typeof item.newsItem === 'object' && item.newsItem) {
      const n = item.newsItem as NewsItem
      if (n.hidden) continue
      entries.push({ kind: 'news', title: n.title, url: `${SITE}/news/${n.slug}`, text: item.blurb || n.summary, source: (n.source as Source).name })
    }
    if (item.kind === 'build' && typeof item.build === 'object' && item.build?.status === 'published') {
      const b = item.build as Build
      entries.push({ kind: 'build', title: b.title, url: `${SITE}/builds/${b.slug}`, text: item.blurb || b.excerpt, image: photo(b), meta: buildMeta(b) })
    }
  }
  const f = typeof full.featuredBuild === 'object' && full.featuredBuild?.status === 'published' ? full.featuredBuild : null
  return {
    subject: full.subject,
    intro: full.intro,
    featured: f ? { title: f.title, url: `${SITE}/builds/${f.slug}`, text: f.excerpt, image: photo(f), meta: buildMeta(f) } : null,
    entries,
  }
}
