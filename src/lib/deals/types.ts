import type { BrowserFetcher } from './browser'
import type { DealSource } from './options'

// The common shape every adapter returns.
export type Listing = {
  source: DealSource
  marketplace?: string // site name for source "other"
  externalId: string
  title: string
  price: number | null
  currency: string
  location?: string
  country: string
  url: string
  image?: string
  postedAt?: Date
  // Seller reputation where the site provides it (eBay).
  sellerRating?: string
  sellerFeedbackScore?: number
  sellerFeedbackPct?: number
}

export type SearchQuery = {
  keywords: string
  minPrice?: number | null // EUR
  maxPrice?: number | null // EUR
  countries: string[] // empty = every country the adapter covers
}

export type Fetcher = (url: string, init?: { headers?: Record<string, string>; respectRobots?: boolean; method?: string; body?: string }) => Promise<string>

// What an adapter may use to reach its site. Both follow the per-site rules in http.ts.
export type Tools = { fetch: Fetcher; browser: BrowserFetcher }

export type Adapter = {
  source: DealSource
  // Countries this source can search.
  countries: string[]
  search: (query: SearchQuery, tools: Tools) => Promise<Listing[]>
}
