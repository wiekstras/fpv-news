import type { Payload } from 'payload'
import type { Source } from '@/payload-types'

type SourceSeed = Pick<Source, 'name' | 'slug' | 'type' | 'url' | 'siteUrl' | 'defaultTags'>

const SOURCES: SourceSeed[] = [
  {
    name: 'Betaflight',
    slug: 'betaflight',
    type: 'github',
    url: 'https://github.com/betaflight/betaflight/releases.atom',
    siteUrl: 'https://betaflight.com',
  },
  {
    name: 'INAV',
    slug: 'inav',
    type: 'github',
    url: 'https://github.com/iNavFlight/inav/releases.atom',
    siteUrl: 'https://github.com/iNavFlight/inav',
  },
  {
    name: 'ExpressLRS',
    slug: 'expresslrs',
    type: 'github',
    url: 'https://github.com/ExpressLRS/ExpressLRS/releases.atom',
    siteUrl: 'https://www.expresslrs.org',
  },
  {
    name: 'EdgeTX',
    slug: 'edgetx',
    type: 'github',
    url: 'https://github.com/EdgeTX/edgetx/releases.atom',
    siteUrl: 'https://edgetx.org',
  },
  {
    name: 'Joshua Bardwell',
    slug: 'joshua-bardwell',
    type: 'youtube',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCX3eufnI7A2I7IkKHZn8KSQ',
    siteUrl: 'https://www.youtube.com/@JoshuaBardwell',
  },
  {
    name: 'Oscar Liang',
    slug: 'oscar-liang',
    type: 'rss',
    url: 'https://oscarliang.com/feed/',
    siteUrl: 'https://oscarliang.com',
  },
]

export async function seedSources(payload: Payload) {
  for (const source of SOURCES) {
    const { totalDocs } = await payload.count({ collection: 'sources', where: { slug: { equals: source.slug } } })
    if (totalDocs > 0) continue
    await payload.create({ collection: 'sources', data: { ...source, active: true } })
    payload.logger.info(`Seeded source: ${source.name}`)
  }
}
