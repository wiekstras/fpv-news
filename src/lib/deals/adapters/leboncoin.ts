import { zonedTime } from '../../time'
import { nextData } from '../nextData'
import type { Adapter, Listing, SearchQuery } from '../types'

// leboncoin (FR): search page rendered with the browser; results come from its Next.js page data.
const BASE = 'https://www.leboncoin.fr'

export function buildLeboncoinUrl(query: SearchQuery) {
  const params = new URLSearchParams({ text: query.keywords, sort: 'time', order: 'desc' })
  if (query.minPrice || query.maxPrice) params.set('price', `${query.minPrice ?? 'min'}-${query.maxPrice ?? 'max'}`)
  return `${BASE}/recherche?${params}`
}

type Ad = {
  list_id: number
  subject: string
  url?: string
  price?: number[]
  images?: { thumb_url?: string; small_url?: string; urls?: string[] }
  location?: { city?: string; zipcode?: string }
  first_publication_date?: string // "2026-10-27 14:05:00", Paris time
}

export function parseLeboncoin(html: string): Listing[] {
  const ads: Ad[] = nextData(html)?.props?.pageProps?.searchData?.ads ?? []
  return ads
    .filter((ad) => ad.list_id && ad.subject)
    .map((ad) => {
      const [day, time] = ad.first_publication_date?.split(' ') ?? []
      return {
        source: 'leboncoin',
        externalId: String(ad.list_id),
        title: ad.subject,
        price: ad.price?.[0] ?? null,
        currency: 'EUR',
        location: [ad.location?.zipcode, ad.location?.city].filter(Boolean).join(' ') || undefined,
        country: 'FR',
        url: ad.url ?? `${BASE}/ad/${ad.list_id}`,
        image: ad.images?.urls?.[0] ?? ad.images?.thumb_url ?? ad.images?.small_url,
        postedAt: day && time ? zonedTime(day, time.slice(0, 5), 'Europe/Paris') : undefined,
      }
    })
}

export const leboncoin: Adapter = {
  source: 'leboncoin',
  countries: ['FR'],
  async search(query, { browser }) {
    if (query.countries.length && !query.countries.includes('FR')) return []
    const { html } = await browser(buildLeboncoinUrl(query))
    return parseLeboncoin(html)
  },
}
