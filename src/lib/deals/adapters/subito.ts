import { zonedTime } from '../../time'
import { nextData, toNumber } from '../nextData'
import type { Adapter, Listing, SearchQuery } from '../types'

// Subito (IT): "for sale, used" search across Italy; results from its Next.js page data.
export function buildSubitoUrl(query: SearchQuery) {
  const params = new URLSearchParams({ q: query.keywords, order: 'datedesc' })
  if (query.minPrice) params.set('ps', String(query.minPrice))
  if (query.maxPrice) params.set('pe', String(query.maxPrice))
  return `https://www.subito.it/annunci-italia/vendita/usato/?${params}`
}

type Item = {
  urn: string
  subject: string
  urls?: { default?: string }
  images?: { cdnBaseUrl?: string }[]
  features?: Record<string, { values?: { key?: string; value?: string }[] }>
  geo?: { town?: { value?: string }; city?: { shortName?: string } }
  date?: string // "2026-10-27 14:05:00", Rome time
}

export function parseSubito(html: string): Listing[] {
  const list: { item?: Item }[] = nextData(html)?.props?.pageProps?.initialState?.items?.list ?? []
  return list
    .map((entry) => entry.item)
    .filter((item): item is Item => Boolean(item?.urn && item.subject && item.urls?.default))
    .map((item) => {
      const [day, time] = item.date?.split(' ') ?? []
      return {
        source: 'subito',
        externalId: item.urn.split(':').pop()!,
        title: item.subject,
        price: toNumber(item.features?.['/price']?.values?.[0]?.key),
        currency: 'EUR',
        location: item.geo?.town?.value ?? item.geo?.city?.shortName,
        country: 'IT',
        url: item.urls!.default!,
        image: item.images?.[0]?.cdnBaseUrl,
        postedAt: day && time ? zonedTime(day, time.slice(0, 5), 'Europe/Rome') : undefined,
      }
    })
}

export const subito: Adapter = {
  source: 'subito',
  countries: ['IT'],
  async search(query, { browser }) {
    if (query.countries.length && !query.countries.includes('IT')) return []
    const { html } = await browser(buildSubitoUrl(query))
    return parseSubito(html)
  },
}
