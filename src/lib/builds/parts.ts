import type { AffiliateLink, Build, Part, Retailer } from '@/payload-types'

export type PartLink = { id: number; retailer: string; url: string; price: number | null }

export type PartRow = {
  name: string
  category?: string
  quantity: number
  note?: string | null
  // Price per piece: the row's own price, else the cheapest known shop price.
  unitPrice: number | null
  links: PartLink[] // cheapest first; links without a price last
}

// Turn a build's parts list into display rows, attaching the active affiliate links of catalog
// parts. Free-text parts never get links.
export function resolveParts(parts: Build['parts'], affiliateLinks: AffiliateLink[]): PartRow[] {
  return (parts ?? []).map((row) => {
    const part = typeof row.part === 'object' ? (row.part as Part | null) : null
    const links = part
      ? affiliateLinks
          .filter((l) => l.active !== false && (typeof l.part === 'object' ? l.part.id : l.part) === part.id)
          .map((l) => ({ id: l.id, retailer: (l.retailer as Retailer).name, url: l.url, price: l.price ?? null }))
          .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
      : []
    return {
      name: part ? [part.brand, part.name].filter(Boolean).join(' ') : (row.freeText ?? ''),
      category: part?.category,
      quantity: row.quantity ?? 1,
      note: row.note,
      unitPrice: row.price ?? links[0]?.price ?? null,
      links,
    }
  })
}

export const hasAffiliateLinks = (rows: PartRow[]) => rows.some((r) => r.links.length > 0)

// Estimated build cost from the rows that have a price.
export function buildTotal(rows: PartRow[]) {
  const priced = rows.filter((r) => r.unitPrice != null)
  return {
    total: Math.round(priced.reduce((sum, r) => sum + r.unitPrice! * r.quantity, 0) * 100) / 100,
    priced: priced.length,
    count: rows.length,
  }
}

// Catalog part ids referenced by a build, for fetching their affiliate links.
export function catalogPartIds(parts: Build['parts']): number[] {
  return (parts ?? [])
    .map((row) => (typeof row.part === 'object' ? row.part?.id : row.part))
    .filter((id): id is number => typeof id === 'number')
}
