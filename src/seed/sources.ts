import type { Payload } from 'payload'
import type { Source } from '@/payload-types'

type SourceSeed = Pick<Source, 'name' | 'slug' | 'type' | 'url' | 'siteUrl' | 'defaultTags' | 'requireKeywords'>

// For general drone sites: only keep stories that are about FPV.
const FPV_KEYWORDS =
  'fpv, betaflight, inav, expresslrs, elrs, edgetx, walksnail, hdzero, avata, goggles, cinewhoop, tinywhoop, whoop, freestyle, racing drone, radiomaster, tbs, o3, o4'

const googleNews = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:7d`)}&hl=en-US&gl=US&ceid=US:en`

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
    name: 'ExpressLRS Configurator',
    slug: 'expresslrs-configurator',
    type: 'github',
    url: 'https://github.com/ExpressLRS/ExpressLRS-Configurator/releases.atom',
    siteUrl: 'https://www.expresslrs.org',
  },
  {
    name: 'Bluejay ESC firmware',
    slug: 'bluejay',
    type: 'github',
    url: 'https://github.com/bird-sanctuary/bluejay/releases.atom',
    siteUrl: 'https://github.com/bird-sanctuary/bluejay',
  },
  {
    name: 'AM32 ESC firmware',
    slug: 'am32',
    type: 'github',
    url: 'https://github.com/am32-firmware/AM32/releases.atom',
    siteUrl: 'https://am32.ca',
  },
  {
    name: 'HDZero goggles',
    slug: 'hdzero-goggle',
    type: 'github',
    url: 'https://github.com/hd-zero/hdzero-goggle/releases.atom',
    siteUrl: 'https://www.hd-zero.com',
  },
  {
    name: 'DroneDJ',
    slug: 'dronedj',
    type: 'rss',
    url: 'https://dronedj.com/feed/',
    siteUrl: 'https://dronedj.com',
    requireKeywords: FPV_KEYWORDS,
  },
  {
    name: 'DroneXL',
    slug: 'dronexl',
    type: 'rss',
    url: 'https://dronexl.co/feed/',
    siteUrl: 'https://dronexl.co',
    requireKeywords: FPV_KEYWORDS,
  },
  {
    name: 'DroneLife',
    slug: 'dronelife',
    type: 'rss',
    url: 'https://dronelife.com/feed/',
    siteUrl: 'https://dronelife.com',
    requireKeywords: FPV_KEYWORDS,
  },
  // Google News searches: a safety net for stories from sites we don't follow directly.
  {
    name: 'Google News: FPV drones',
    slug: 'google-news-fpv',
    type: 'rss',
    url: googleNews('"FPV drone" OR "FPV drones" OR "FPV goggles"'),
    siteUrl: 'https://news.google.com',
  },
  {
    name: 'Google News: FPV firmware & gear',
    slug: 'google-news-fpv-gear',
    type: 'rss',
    url: googleNews('Betaflight OR ExpressLRS OR EdgeTX OR Walksnail OR HDZero OR "DJI O4" OR "DJI Goggles" OR "DJI Avata" OR RadioMaster'),
    siteUrl: 'https://news.google.com',
  },
  {
    name: 'Google News: drone rules (EU)',
    slug: 'google-news-drone-rules',
    type: 'rss',
    url: googleNews('EASA drone rules OR "drone regulation" OR "Remote ID" Europe'),
    siteUrl: 'https://news.google.com',
    defaultTags: ['regulation'],
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
