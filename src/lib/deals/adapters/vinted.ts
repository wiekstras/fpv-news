import { toNumber } from '../nextData'
import type { Adapter, Listing, SearchQuery } from '../types'

// Vinted: the catalog page loads its results from /api/v2/catalog/items; the browser opens
// the page like a visitor and we read that response.
const DOMAINS: Record<string, string> = {
  NL: 'www.vinted.nl',
  BE: 'www.vinted.be',
  DE: 'www.vinted.de',
  AT: 'www.vinted.at',
  FR: 'www.vinted.fr',
  IT: 'www.vinted.it',
  ES: 'www.vinted.es',
  PT: 'www.vinted.pt',
  PL: 'www.vinted.pl',
  CZ: 'www.vinted.cz',
  DK: 'www.vinted.dk',
  SE: 'www.vinted.se',
  IE: 'www.vinted.ie',
  GB: 'www.vinted.co.uk',
}
const DEFAULT_COUNTRIES = ['NL', 'DE', 'FR', 'BE']

export function buildVintedUrl(query: SearchQuery, country: string) {
  const params = new URLSearchParams({ search_text: query.keywords, order: 'newest_first' })
  if (query.minPrice) params.set('price_from', String(query.minPrice))
  if (query.maxPrice) params.set('price_to', String(query.maxPrice))
  return `https://${DOMAINS[country]}/catalog?${params}`
}

type Item = {
  id: number
  title: string
  url?: string
  price?: { amount?: string; currency_code?: string } | string
  currency?: string
  photo?: { url?: string }
}

export function parseVinted(json: unknown, country: string): Listing[] {
  const items: Item[] = (json as { items?: Item[] })?.items ?? []
  return items
    .filter((i) => i.id && i.title)
    .map((i) => {
      const price = typeof i.price === 'object' ? i.price : { amount: i.price, currency_code: i.currency }
      const url = i.url ?? `/items/${i.id}`
      return {
        source: 'vinted',
        externalId: String(i.id),
        title: i.title,
        price: toNumber(price?.amount),
        currency: price?.currency_code ?? 'EUR',
        country,
        url: url.startsWith('http') ? url : `https://${DOMAINS[country]}${url}`,
        image: i.photo?.url,
      }
    })
}

export const vinted: Adapter = {
  source: 'vinted',
  countries: Object.keys(DOMAINS),
  async search(query, { browser }) {
    const countries = (query.countries.length ? query.countries : DEFAULT_COUNTRIES).filter((c) => c in DOMAINS)
    const listings: Listing[] = []
    for (const country of countries) {
      const { json } = await browser(buildVintedUrl(query, country), { waitForJson: /\/api\/v2\/catalog\/items/ })
      if (!json) throw new Error(`No search results data from ${DOMAINS[country]} (page format changed?)`)
      listings.push(...parseVinted(json, country))
    }
    return listings
  },
}
