import { ADAPTERS } from './adapters'
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

export type FoundListing = Listing & { priceEur: number | null; discountPct: number | null }

// One-off search across sources in parallel (each site still gets its own spacing), filtered,
// converted to EUR, compared with the new price and sorted cheapest first. Nothing is stored.
export async function searchAll(opts: {
  query: SearchQuery & { excludeKeywords?: string | null }
  sources: DealSource[]
  permitted: Set<DealSource>
  rates: Record<string, number>
  reference: number | null
}) {
  const settled = await Promise.allSettled(opts.sources.map((s) => searchSource(s, opts.query, opts.permitted.has(s))))
  const listings: FoundListing[] = []
  const perSource: { source: DealSource; found?: number; error?: string }[] = []
  settled.forEach((result, i) => {
    const source = opts.sources[i]
    if (result.status === 'rejected') {
      perSource.push({ source, error: result.reason instanceof Error ? result.reason.message : String(result.reason) })
      return
    }
    perSource.push({ source, found: result.value.length })
    for (const listing of result.value) {
      const priceEur = toEur(listing.price, listing.currency, opts.rates)
      if (!matchesSearch(listing, priceEur, { ...opts.query })) continue
      listings.push({ ...listing, priceEur, discountPct: discountPct(priceEur, opts.reference) })
    }
  })
  listings.sort((a, b) => (a.priceEur ?? Infinity) - (b.priceEur ?? Infinity))
  return { listings, perSource }
}
