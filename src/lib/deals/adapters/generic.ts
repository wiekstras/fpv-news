import { extractListings } from '../structuredData'
import type { Listing, SearchQuery, Tools } from '../types'

// A marketplace from the admin's Marketplaces list, searched by loading its search URL and
// reading the schema.org data (JSON-LD / microdata) on the results page.
export type MarketplaceSite = {
  slug: string
  name: string
  country: string
  searchUrl: string // with {q}, {min}, {max}
  mode: 'http' | 'browser'
  currency: string
}

export function buildSiteUrl(template: string, query: SearchQuery) {
  return template
    .replaceAll('{q}', encodeURIComponent(query.keywords))
    .replaceAll('{min}', query.minPrice ? String(query.minPrice) : '')
    .replaceAll('{max}', query.maxPrice ? String(query.maxPrice) : '')
}

export function listingsFromPage(site: MarketplaceSite, html: string, pageUrl: string): Listing[] {
  return extractListings(html, pageUrl).map((item) => ({
    source: 'other',
    marketplace: site.name,
    externalId: `${site.slug}:${item.url}`,
    title: item.name,
    price: item.price,
    currency: item.currency ?? site.currency,
    country: site.country,
    url: item.url,
    image: item.image,
  }))
}

export async function searchSite(site: MarketplaceSite, query: SearchQuery, tools: Tools): Promise<Listing[]> {
  if (query.countries.length && !query.countries.includes(site.country)) return []
  const url = buildSiteUrl(site.searchUrl, query)
  const html = site.mode === 'browser' ? (await tools.browser(url)).html : await tools.fetch(url, { headers: { accept: 'text/html' } })
  const listings = listingsFromPage(site, html, url)
  if (listings.length === 0) {
    throw new Error('No listings in the page’s structured data: check the search URL, try browser mode, or it needs a dedicated adapter')
  }
  return listings
}
