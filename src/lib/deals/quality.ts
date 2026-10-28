import { normalizeTitle, titleSimilarity } from '../news/dedupe'

export const SUSPICIOUS_DISCOUNT = 70

// A short reason when a deal looks too good to be true, otherwise null.
export function dealWarning(l: { discountPct: number | null; sellerFeedbackScore?: number; sellerFeedbackPct?: number }) {
  if (l.discountPct != null && l.discountPct >= SUSPICIOUS_DISCOUNT) {
    return `${l.discountPct}% below the new price: check the seller and never pay outside the platform`
  }
  const newSeller = l.sellerFeedbackScore != null && l.sellerFeedbackScore < 5
  const poorSeller = l.sellerFeedbackPct != null && l.sellerFeedbackPct < 95
  if ((newSeller || poorSeller) && l.discountPct != null && l.discountPct >= 40) {
    return `Big discount from a ${newSeller ? 'new' : 'low-rated'} seller`
  }
  return null
}

type Candidate = { id: number; title: string; source: string; priceEur?: number | null }

// The same item posted on another site: similar title and a price within ±10%.
export function findDuplicate(listing: { title: string; source: string; priceEur: number | null }, others: Candidate[]) {
  const title = normalizeTitle(listing.title)
  return (
    others.find((o) => {
      if (o.source === listing.source || listing.priceEur == null || o.priceEur == null) return false
      if (Math.abs(o.priceEur - listing.priceEur) > listing.priceEur * 0.1) return false
      const other = normalizeTitle(o.title)
      return other === title || titleSimilarity(title, other) >= 0.6
    }) ?? null
  )
}
