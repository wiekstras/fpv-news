const median = (sorted: number[]) => {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// "What does this cost new?" from a set of new-item prices (EUR). Searches also return
// accessories and spare parts, so prices far from the median are dropped before taking it again.
// Needs at least 3 prices to say anything.
export function marketPrice(prices: number[]): number | null {
  const sorted = prices.filter((p) => p > 0).sort((a, b) => a - b)
  if (sorted.length < 3) return null
  const first = median(sorted)
  const core = sorted.filter((p) => p >= first * 0.5 && p <= first * 2)
  return Math.round(median(core.length >= 3 ? core : sorted))
}

// Percentage below the new price: 35 means 35% cheaper than new, negative means pricier than new.
export function discountPct(priceEur: number | null, reference: number | null | undefined): number | null {
  if (priceEur == null || !reference) return null
  return Math.round((1 - priceEur / reference) * 100)
}
