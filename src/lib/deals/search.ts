import { ADAPTERS } from './adapters'
import { type MarketplaceSite, searchSite } from './adapters/generic'
import { browserFetch } from './browser'
import { toEur } from './fx'
import { politeFetch } from './http'
import { matchesSearch } from './match'
import type { DealSource } from './options'
import { discountPct } from './reference'
import type { Listing, SearchQuery, Tools } from './types'

// Fetchers for one source. robots.txt is skipped only for sites you marked as having given permission.
export function toolsFor(permitted: boolean): Tools {
  return {
    fetch: (url, init = {}) => politeFetch(url, { ...init, respectRobots: init.respectRobots !== false && !permitted }),
    browser: (url, options = {}) => browserFetch(url, { ...options, respectRobots: options.respectRobots !== false && !permitted }),
  }
}

export async function searchSource(source: DealSource, query: SearchQuery, permitted: boolean): Promise<Listing[]> {
  const adapter = ADAPTERS[source]
  if (!adapter) throw new Error('No adapter for this source yet')
  return adapter.search(query, toolsFor(permitted))
}

// Every site from the Marketplaces list in parallel (different hosts); one result per site.
export async function searchSites<T extends MarketplaceSite & { permitted?: boolean | null }>(sites: T[], query: SearchQuery) {
  const settled = await Promise.allSettled(sites.map((site) => searchSite(site, query, toolsFor(Boolean(site.permitted)))))
  return settled.map((r, i) => ({
    site: sites[i],
    listings: r.status === 'fulfilled' ? r.value : [],
    error: r.status === 'rejected' ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : undefined,
  }))
}

export type FoundListing = Listing & { priceEur: number | null; discountPct: number | null }

// One-off search across sources in parallel (each site still gets its own spacing), filtered,
// converted to EUR, compared with the new price and sorted cheapest first. Nothing is stored.
export async function searchAll(opts: {
  query: SearchQuery & { excludeKeywords?: string | null }
  sources: DealSource[]
  permitted: Set<DealSource>
  sites: (MarketplaceSite & { permitted?: boolean | null })[]
  rates: Record<string, number>
  reference: number | null
}) {
  const builtIn = opts.sources.filter((s) => s !== 'other')
  const [settled, siteResults] = await Promise.all([
    Promise.allSettled(builtIn.map((s) => searchSource(s, opts.query, opts.permitted.has(s)))),
    opts.sources.includes('other') ? searchSites(opts.sites, opts.query) : Promise.resolve([]),
  ])
  const results: { source: string; listings: Listing[]; error?: string }[] = [
    ...settled.map((r, i) => ({
      source: builtIn[i] as string,
      listings: r.status === 'fulfilled' ? r.value : [],
      error: r.status === 'rejected' ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : undefined,
    })),
    ...siteResults.map((r) => ({ source: r.site.name, listings: r.listings, error: r.error })),
  ]

  const listings: FoundListing[] = []
  const perSource: { source: string; found?: number; error?: string }[] = []
  results.forEach((result) => {
    if (result.error) {
      perSource.push({ source: result.source, error: result.error })
      return
    }
    perSource.push({ source: result.source, found: result.listings.length })
    for (const listing of result.listings) {
      const priceEur = toEur(listing.price, listing.currency, opts.rates)
      if (!matchesSearch(listing, priceEur, { ...opts.query })) continue
      listings.push({ ...listing, priceEur, discountPct: discountPct(priceEur, opts.reference) })
    }
  })
  listings.sort((a, b) => (a.priceEur ?? Infinity) - (b.priceEur ?? Infinity))
  return { listings, perSource }
}
