import type { Adapter, Listing, SearchQuery } from '../types'

// Marktplaats (NL) and 2dehands (BE) run on the same platform and expose the JSON
// that their own search pages load. Read-only, no login, rate-limited by politeFetch.
const SITES: Record<string, string> = {
  NL: 'https://www.marktplaats.nl',
  BE: 'https://www.2dehands.be',
}

export function buildMarktplaatsUrl(query: SearchQuery, country: string) {
  const params = new URLSearchParams({
    query: query.keywords,
    limit: '30',
    offset: '0',
    sortBy: 'SORT_INDEX',
    sortOrder: 'DECREASING',
    viewOptions: 'list-view',
  })
  return `${SITES[country]}/lrp/api/search?${params}`
}

type MpListing = {
  itemId: string
  title: string
  priceInfo?: { priceCents?: number; priceType?: string }
  location?: { cityName?: string; countryAbbreviation?: string }
  date?: string
  vipUrl?: string
  pictures?: { mediumUrl?: string; largeUrl?: string }[]
  imageUrls?: string[]
}

function price(info: MpListing['priceInfo']): number | null {
  if (!info) return null
  if (info.priceType === 'FREE') return 0
  // "SEE_DESCRIPTION", "NOTK" (to be agreed), "RESERVED" etc. carry no usable price.
  return info.priceCents ? info.priceCents / 100 : null
}

const absolute = (url: string | undefined, base: string) =>
  url ? (url.startsWith('//') ? `https:${url}` : new URL(url, base).toString()) : undefined

export function parseMarktplaats(json: string, country: string): Listing[] {
  const base = SITES[country]
  const listings: MpListing[] = JSON.parse(json).listings ?? []
  return listings
    .filter((l) => l.itemId && l.title && l.vipUrl)
    .map((l) => {
      const posted = l.date && /^\d{4}-\d{2}-\d{2}T/.test(l.date) ? new Date(l.date) : undefined
      return {
        source: 'marktplaats',
        externalId: l.itemId,
        title: l.title,
        price: price(l.priceInfo),
        currency: 'EUR',
        location: l.location?.cityName,
        country: l.location?.countryAbbreviation ?? country,
        url: absolute(l.vipUrl, base)!,
        image: absolute(l.pictures?.[0]?.mediumUrl ?? l.imageUrls?.[0], base),
        postedAt: posted,
      }
    })
}

export const marktplaats: Adapter = {
  source: 'marktplaats',
  countries: Object.keys(SITES),
  async search(query, fetch) {
    const countries = (query.countries.length ? query.countries : Object.keys(SITES)).filter((c) => c in SITES)
    const listings: Listing[] = []
    for (const country of countries) {
      const body = await fetch(buildMarktplaatsUrl(query, country), { headers: { accept: 'application/json' } })
      listings.push(...parseMarktplaats(body, country))
    }
    return listings
  },
}
