import config from '@payload-config'
import { getPayload, type Where } from 'payload'

export const PAGE_SIZE = 20

// Public news feed, newest first, optionally filtered by tag or source.
export async function getFeed({ tag, sourceId, page = 1 }: { tag?: string; sourceId?: number; page?: number }) {
  const payload = await getPayload({ config })
  const where: Where = { hidden: { not_equals: true } }
  if (tag) where.tags = { contains: tag }
  if (sourceId) where.source = { equals: sourceId }
  return payload.find({
    collection: 'news-items',
    where,
    sort: '-publishedAt',
    limit: PAGE_SIZE,
    page: Math.max(1, page),
    depth: 1,
    overrideAccess: false,
  })
}

export async function getSources() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'sources',
    where: { active: { equals: true } },
    sort: 'name',
    pagination: false,
    select: { name: true, slug: true, type: true },
  })
  return docs
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date(iso))
}
