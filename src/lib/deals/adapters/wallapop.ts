import { toNumber } from '../nextData'
import type { Adapter, Listing, SearchQuery } from '../types'

// Wallapop (ES): the search page loads results from api.wallapop.com; the browser opens the
// page like a visitor and we read that response.
const BASE = 'https://es.wallapop.com'

export function buildWallapopUrl(query: SearchQuery) {
  const params = new URLSearchParams({ keywords: query.keywords, order_by: 'newest' })
  if (query.minPrice) params.set('min_sale_price', String(query.minPrice))
  if (query.maxPrice) params.set('max_sale_price', String(query.maxPrice))
  return `${BASE}/app/search?${params}`
}

type Item = {
  id: string
  title: string
  price?: { amount?: number | string; currency?: string } | number
  currency?: string
  location?: { city?: string; postal_code?: string }
  images?: { urls?: { medium?: string; small?: string; big?: string } }[]
  web_slug?: string
  created_at?: number // ms since epoch
}

export function parseWallapop(json: unknown): Listing[] {
  const data = json as { data?: { section?: { payload?: { items?: Item[] } } }; search_objects?: Item[] }
  const items = data?.data?.section?.payload?.items ?? data?.search_objects ?? []
  return items
    .filter((i) => i.id && i.title && i.web_slug)
    .map((i) => {
      const price = typeof i.price === 'object' ? i.price : { amount: i.price, currency: i.currency }
      return {
        source: 'wallapop',
        externalId: i.id,
        title: i.title,
        price: toNumber(price?.amount),
        currency: price?.currency ?? 'EUR',
        location: i.location?.city,
        country: 'ES',
        url: `${BASE}/item/${i.web_slug}`,
        image: i.images?.[0]?.urls?.medium ?? i.images?.[0]?.urls?.small,
        postedAt: i.created_at ? new Date(i.created_at) : undefined,
      }
    })
}

export const wallapop: Adapter = {
  source: 'wallapop',
  countries: ['ES'],
  async search(query, { browser }) {
    if (query.countries.length && !query.countries.includes('ES')) return []
    const { json } = await browser(buildWallapopUrl(query), { waitForJson: /api\.wallapop\.com\/api\/v3\/search/ })
    if (!json) throw new Error('No search results data from Wallapop (page format changed?)')
    return parseWallapop(json)
  },
}
