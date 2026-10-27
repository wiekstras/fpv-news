type Criteria = {
  minPrice?: number | null
  maxPrice?: number | null
  countries?: string[] | null
  excludeKeywords?: string | null
}

// Final filter applied to every listing an adapter returns, on the EUR price.
export function matchesSearch(listing: { title: string; country: string }, priceEur: number | null, search: Criteria) {
  const hasRange = search.minPrice != null || search.maxPrice != null
  if (priceEur === null) {
    if (hasRange) return false
  } else {
    if (search.minPrice != null && priceEur < search.minPrice) return false
    if (search.maxPrice != null && priceEur > search.maxPrice) return false
  }
  if (search.countries?.length && !search.countries.includes(listing.country)) return false
  const excluded = (search.excludeKeywords ?? '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
  const title = listing.title.toLowerCase()
  return !excluded.some((w) => title.includes(w))
}
