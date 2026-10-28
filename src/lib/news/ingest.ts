import { createHash } from 'crypto'
import type { Payload } from 'payload'
import type { Source } from '@/payload-types'
import { fetchText } from '../http'
import { slugify } from '../slugify'
import { autoTags } from './autoTags'
import { canonicalizeUrl } from './canonical'
import { isNearDuplicate, normalizeTitle } from './dedupe'
import { cleanGoogleNewsTitle, isGoogleNews, matchesAnyKeyword } from './filters'
import { postToChannels } from '../notify'
import { SITE_URL } from '../site'
import { latestReleases } from './firmware'
import { extractPageMeta } from './pageMeta'
import { type FeedEntry, parseFeed } from './parseFeed'
import { summarize } from './summarize'

const DAY = 24 * 60 * 60 * 1000
const MAX_ENTRIES_PER_FETCH = 50
const MAX_AGE_DAYS = 60

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function exists(payload: Payload, canonicalUrl: string) {
  const { totalDocs } = await payload.count({
    collection: 'news-items',
    where: { canonicalUrl: { equals: canonicalUrl } },
    overrideAccess: true,
  })
  return totalDocs > 0
}

export async function ingestSource(payload: Payload, source: Source, useClaude: boolean) {
  const all = await parseFeed(await fetchText(source.url))
  if (source.type === 'github') await updateFirmwareVersions(payload, source, all)
  const entries = all
    .filter((e) => e.publishedAt.getTime() > Date.now() - MAX_AGE_DAYS * DAY)
    .slice(0, MAX_ENTRIES_PER_FETCH)

  const recent = await payload.find({
    collection: 'news-items',
    where: { publishedAt: { greater_than: new Date(Date.now() - 7 * DAY).toISOString() } },
    select: { normalizedTitle: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const recentTitles = recent.docs.map((d) => d.normalizedTitle).filter((t): t is string => Boolean(t))

  const googleNews = isGoogleNews(source.url)
  let created = 0
  let skipped = 0
  for (const entry of entries) {
    if (!matchesAnyKeyword(`${entry.title} ${entry.description ?? ''}`, source.requireKeywords)) {
      skipped++
      continue
    }
    // GitHub release titles are often just "v4.5.1"; prefix the project name.
    const title = googleNews
      ? cleanGoogleNewsTitle(entry.title)
      : source.type === 'github' && !normalizeTitle(entry.title).includes(normalizeTitle(source.name))
        ? `${source.name} ${entry.title}`
        : entry.title
    const normalizedTitle = normalizeTitle(title)
    let canonicalUrl = canonicalizeUrl(entry.url)
    if ((await exists(payload, canonicalUrl)) || isNearDuplicate(normalizedTitle, recentTitles)) {
      skipped++
      continue
    }

    // Articles: read the page head for rel=canonical and og:image.
    // GitHub's feed thumbnail is the release author's avatar, not a useful preview.
    let thumbnailUrl = source.type === 'github' ? undefined : entry.thumbnailUrl
    // (Google News links are redirects to the publisher; nothing useful to read there.)
    if ((source.type === 'rss' || source.type === 'blog') && !googleNews) {
      try {
        await sleep(1000)
        const meta = extractPageMeta(await fetchText(entry.url), entry.url)
        if (meta.canonicalUrl) canonicalUrl = canonicalizeUrl(meta.canonicalUrl)
        thumbnailUrl ||= meta.imageUrl
      } catch (err) {
        payload.logger.warn({ err, url: entry.url }, 'Could not read article page')
      }
      if (await exists(payload, canonicalUrl)) {
        skipped++
        continue
      }
    }

    let summary: string | undefined
    let tags = autoTags(source.type, source.defaultTags ?? [], title, entry.description)
    if (useClaude) {
      try {
        const result = await summarize({ title, sourceName: source.name, excerpt: entry.description })
        if (result) {
          summary = result.summary
          tags = [...new Set([...tags, ...(result.tags as typeof tags)])]
        }
      } catch (err) {
        payload.logger.warn({ err, title }, 'Claude summary failed')
      }
    }

    const hash = createHash('sha1').update(canonicalUrl).digest('hex').slice(0, 6)
    await payload.create({
      collection: 'news-items',
      overrideAccess: true,
      data: {
        title,
        slug: `${slugify(title) || 'item'}-${hash}`,
        source: source.id,
        url: entry.url,
        canonicalUrl,
        normalizedTitle,
        publishedAt: entry.publishedAt.toISOString(),
        summary,
        thumbnailUrl,
        tags,
      },
    })
    recentTitles.push(normalizedTitle)
    created++
    // Fresh firmware releases go to the community channels (Discord/Telegram), if configured.
    if (tags.includes('firmware') && Date.now() - entry.publishedAt.getTime() < 2 * DAY) {
      await postToChannels({
        title,
        message: summary ?? `New release from ${source.name}`,
        url: `${SITE_URL}/news/${slugify(title) || 'item'}-${hash}`,
      })
    }
  }
  return { created, skipped }
}

// Fetch every active source (or one), recording success/failure on the source.
export async function fetchSources(payload: Payload, sourceId?: number) {
  const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
  const { docs: sources } = await payload.find({
    collection: 'sources',
    where: sourceId ? { id: { equals: sourceId } } : { active: { equals: true } },
    pagination: false,
    overrideAccess: true,
  })

  const results: { source: string; created?: number; skipped?: number; error?: string }[] = []
  for (const source of sources) {
    try {
      const { created, skipped } = await ingestSource(payload, source, Boolean(settings.claudeSummaries))
      results.push({ source: source.name, created, skipped })
      await payload.update({
        collection: 'sources',
        id: source.id,
        data: { lastFetchedAt: new Date().toISOString(), lastError: '' },
        overrideAccess: true,
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ source: source.name, error })
      await payload.update({
        collection: 'sources',
        id: source.id,
        data: { lastFetchedAt: new Date().toISOString(), lastError: error.slice(0, 500) },
        overrideAccess: true,
      })
    }
  }
  return results
}

// Latest stable / pre-release of a GitHub releases feed, for the /firmware page.
async function updateFirmwareVersions(payload: Payload, source: Source, entries: FeedEntry[]) {
  const { stable, pre } = latestReleases(entries)
  await payload.update({
    collection: 'sources',
    id: source.id,
    data: {
      stableVersion: stable?.version ?? null,
      stableUrl: stable?.url ?? null,
      stableDate: stable?.date.toISOString() ?? null,
      preVersion: pre?.version ?? null,
      preUrl: pre?.url ?? null,
      preDate: pre?.date.toISOString() ?? null,
    },
    overrideAccess: true,
  })
}
