import { nextData, toNumber } from '../nextData'
import type { Adapter, Listing, SearchQuery } from '../types'

// willhaben (AT): marketplace search page; results come from its Next.js page data.
const BASE = 'https://www.willhaben.at'

export function buildWillhabenUrl(query: SearchQuery) {
  const params = new URLSearchParams({ keyword: query.keywords, sort: '1', rows: '60' })
  if (query.minPrice) params.set('PRICE_FROM', String(query.minPrice))
  if (query.maxPrice) params.set('PRICE_TO', String(query.maxPrice))
  return `${BASE}/iad/kaufen-und-verkaufen/marktplatz?${params}`
}

type Advert = {
  id: string
  description?: string
  attributes?: { attribute?: { name: string; values?: string[] }[] }
}

export function parseWillhaben(html: string): Listing[] {
  const adverts: Advert[] = nextData(html)?.props?.pageProps?.searchResult?.advertSummaryList?.advertSummary ?? []
  return adverts.flatMap((ad) => {
    const attr = (name: string) => ad.attributes?.attribute?.find((a) => a.name === name)?.values?.[0]
    const title = attr('HEADING') ?? ad.description
    const seo = attr('SEO_URL')
    if (!ad.id || !title || !seo) return []
    const image = attr('MMO')
    const published = attr('PUBLISHED_String')
    return [
      {
        source: 'willhaben' as const,
        externalId: ad.id,
        title,
        price: toNumber(attr('PRICE')),
        currency: 'EUR',
        location: [attr('POSTCODE'), attr('LOCATION')].filter(Boolean).join(' ') || undefined,
        country: 'AT',
        url: new URL(seo.startsWith('/') ? seo : `/iad/${seo}`, BASE).toString(),
        image: image ? (image.startsWith('http') ? image : `https://cache.willhaben.at/mmo/${image}`) : undefined,
        postedAt: published ? new Date(published) : undefined,
      },
    ]
  })
}

export const willhaben: Adapter = {
  source: 'willhaben',
  countries: ['AT'],
  async search(query, { fetch }) {
    if (query.countries.length && !query.countries.includes('AT')) return []
    return parseWillhaben(await fetch(buildWillhabenUrl(query), { headers: { accept: 'text/html' } }))
  },
}
