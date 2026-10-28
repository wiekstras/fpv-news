import type { Adapter, Listing, SearchQuery } from '../types'

// OLX (PL, PT, RO, BG): the sites share the JSON API their own search pages use.
const SITES: Record<string, string> = {
  PL: 'https://www.olx.pl',
  PT: 'https://www.olx.pt',
  RO: 'https://www.olx.ro',
  BG: 'https://www.olx.bg',
}

export function buildOlxUrl(query: SearchQuery, country: string) {
  const params = new URLSearchParams({ offset: '0', limit: '40', query: query.keywords, sort_by: 'created_at:desc' })
  // Price filters are in the local currency (PLN, RON, BGN), so they're applied after converting to EUR.
  return `${SITES[country]}/api/v1/offers/?${params}`
}

type Offer = {
  id: number
  url: string
  title: string
  created_time?: string
  params?: { key: string; value?: { value?: number; currency?: string } }[]
  location?: { city?: { name?: string }; region?: { name?: string } }
  photos?: { link?: string }[]
}

export function parseOlx(json: string, country: string): Listing[] {
  const offers: Offer[] = JSON.parse(json).data ?? []
  return offers
    .filter((o) => o.id && o.title && o.url)
    .map((o) => {
      const price = o.params?.find((p) => p.key === 'price')?.value
      return {
        source: 'olx',
        externalId: `${country}:${o.id}`,
        title: o.title,
        price: price?.value ?? null,
        currency: price?.currency ?? 'EUR',
        location: o.location?.city?.name,
        country,
        url: o.url,
        image: o.photos?.[0]?.link?.replace('{width}', '400').replace('{height}', '300'),
        postedAt: o.created_time ? new Date(o.created_time) : undefined,
      }
    })
}

export const olx: Adapter = {
  source: 'olx',
  countries: Object.keys(SITES),
  async search(query, { fetch }) {
    const countries = (query.countries.length ? query.countries : Object.keys(SITES)).filter((c) => c in SITES)
    const listings: Listing[] = []
    for (const country of countries) {
      listings.push(...parseOlx(await fetch(buildOlxUrl(query, country), { headers: { accept: 'application/json' } }), country))
    }
    return listings
  },
}
