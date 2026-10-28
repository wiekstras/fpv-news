import type { Adapter, Fetcher, Listing, SearchQuery } from '../types'

// Official eBay Browse API (needs EBAY_CLIENT_ID / EBAY_CLIENT_SECRET from developer.ebay.com).
// One request per country, on that country's eBay site, limited to items located there.
const MARKETPLACES: Record<string, { id: string; currency: string }> = {
  DE: { id: 'EBAY_DE', currency: 'EUR' },
  AT: { id: 'EBAY_AT', currency: 'EUR' },
  NL: { id: 'EBAY_NL', currency: 'EUR' },
  BE: { id: 'EBAY_BE', currency: 'EUR' },
  FR: { id: 'EBAY_FR', currency: 'EUR' },
  IT: { id: 'EBAY_IT', currency: 'EUR' },
  ES: { id: 'EBAY_ES', currency: 'EUR' },
  IE: { id: 'EBAY_IE', currency: 'EUR' },
  PL: { id: 'EBAY_PL', currency: 'PLN' },
  GB: { id: 'EBAY_GB', currency: 'GBP' },
}

const API = process.env.EBAY_API_BASE || 'https://api.ebay.com'
let token: { value: string; expiresAt: number } | undefined

async function getToken(fetch: Fetcher) {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value
  const id = process.env.EBAY_CLIENT_ID
  const secret = process.env.EBAY_CLIENT_SECRET
  if (!id || !secret) throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are not set')
  const json = JSON.parse(
    await fetch(`${API}/identity/v1/oauth2/token`, {
      method: 'POST',
      respectRobots: false,
      headers: {
        authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    }),
  )
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return token.value
}

export function buildEbayUrl(query: SearchQuery, country: string) {
  const market = MARKETPLACES[country]
  const filters = [`itemLocationCountry:${country}`, 'conditions:{USED|UNSPECIFIED}']
  // Price filters must be in the site's currency; for non-EUR sites we filter after converting.
  if (market.currency === 'EUR' && (query.minPrice || query.maxPrice)) {
    filters.push(`price:[${query.minPrice ?? ''}..${query.maxPrice ?? ''}]`, 'priceCurrency:EUR')
  }
  const params = new URLSearchParams({ q: query.keywords, filter: filters.join(','), sort: 'newlyListed', limit: '50' })
  return `${API}/buy/browse/v1/item_summary/search?${params}`
}

type EbayItem = {
  itemId: string
  title: string
  price?: { value: string; currency: string }
  itemWebUrl: string
  image?: { imageUrl: string }
  thumbnailImages?: { imageUrl: string }[]
  itemLocation?: { city?: string; postalCode?: string; country?: string }
  itemCreationDate?: string
}

export function parseEbay(json: string, country: string): Listing[] {
  const items: EbayItem[] = JSON.parse(json).itemSummaries ?? []
  return items.map((item) => ({
    source: 'ebay',
    externalId: item.itemId,
    title: item.title,
    price: item.price ? Number(item.price.value) : null,
    currency: item.price?.currency ?? MARKETPLACES[country].currency,
    location: [item.itemLocation?.postalCode, item.itemLocation?.city].filter(Boolean).join(' ') || undefined,
    country: item.itemLocation?.country ?? country,
    url: item.itemWebUrl,
    image: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl,
    postedAt: item.itemCreationDate ? new Date(item.itemCreationDate) : undefined,
  }))
}

// New, buy-it-now listings on eBay.de: used to estimate what a product costs new.
export function buildEbayNewPriceUrl(keywords: string) {
  const params = new URLSearchParams({
    q: keywords,
    filter: 'conditions:{NEW},buyingOptions:{FIXED_PRICE},priceCurrency:EUR',
    limit: '50',
  })
  return `${API}/buy/browse/v1/item_summary/search?${params}`
}

export function parseEbayPrices(json: string): number[] {
  const items: EbayItem[] = JSON.parse(json).itemSummaries ?? []
  return items.filter((i) => i.price?.currency === 'EUR').map((i) => Number(i.price!.value))
}

export async function ebayNewPrices(keywords: string, fetch: Fetcher): Promise<number[]> {
  const body = await fetch(buildEbayNewPriceUrl(keywords), {
    respectRobots: false,
    headers: { authorization: `Bearer ${await getToken(fetch)}`, 'x-ebay-c-marketplace-id': 'EBAY_DE', accept: 'application/json' },
  })
  return parseEbayPrices(body)
}

export const ebay: Adapter = {
  source: 'ebay',
  countries: Object.keys(MARKETPLACES),
  async search(query, { fetch }) {
    const countries = (query.countries.length ? query.countries : ['DE', 'NL', 'BE', 'FR', 'IT', 'ES', 'AT']).filter(
      (c) => c in MARKETPLACES,
    )
    const listings: Listing[] = []
    for (const country of countries) {
      const body = await fetch(buildEbayUrl(query, country), {
        respectRobots: false, // official API, not crawling
        headers: {
          authorization: `Bearer ${await getToken(fetch)}`,
          'x-ebay-c-marketplace-id': MARKETPLACES[country].id,
          accept: 'application/json',
        },
      })
      listings.push(...parseEbay(body, country))
    }
    return listings
  },
}
