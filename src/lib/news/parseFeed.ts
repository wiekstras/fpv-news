import * as cheerio from 'cheerio'
import Parser from 'rss-parser'

export type FeedEntry = {
  title: string
  url: string
  publishedAt: Date
  thumbnailUrl?: string
  // Plain-text excerpt. Only used as input for summaries, never shown or stored.
  description?: string
}

type Item = Parser.Item & {
  mediaGroup?: Record<string, any[]>
  mediaThumbnail?: { $?: { url?: string } }
  mediaContent?: { $?: { url?: string; medium?: string; type?: string } }
  contentEncoded?: string
}

const parser: Parser<object, Item> = new Parser({
  customFields: {
    item: [
      ['media:group', 'mediaGroup'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

function firstImageInHtml(html?: string): string | undefined {
  if (!html) return undefined
  const src = cheerio.load(html)('img[src]').first().attr('src')
  return src?.startsWith('http') ? src : undefined
}

function thumbnail(item: Item): string | undefined {
  const content = item.mediaContent?.$
  return (
    item.mediaGroup?.['media:thumbnail']?.[0]?.$?.url ||
    item.mediaThumbnail?.$?.url ||
    (content?.medium === 'image' || content?.type?.startsWith('image/') ? content.url : undefined) ||
    (item.enclosure?.type?.startsWith('image/') ? item.enclosure.url : undefined) ||
    firstImageInHtml(item.contentEncoded || item.content)
  )
}

function plainText(item: Item): string | undefined {
  const text =
    item.contentSnippet ||
    item.mediaGroup?.['media:description']?.[0] ||
    (item.content ? cheerio.load(item.content).text() : undefined)
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, 4000) || undefined : undefined
}

// Parse an RSS 2.0 / Atom feed (incl. YouTube and GitHub releases), newest first.
export async function parseFeed(xml: string): Promise<FeedEntry[]> {
  const feed = await parser.parseString(xml)
  const entries: FeedEntry[] = []
  for (const item of feed.items) {
    const date = new Date(item.isoDate || item.pubDate || '')
    if (!item.title || !item.link || Number.isNaN(date.getTime())) continue
    entries.push({
      title: item.title.trim(),
      url: item.link.trim(),
      publishedAt: date,
      thumbnailUrl: thumbnail(item),
      description: plainText(item),
    })
  }
  return entries.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
}
