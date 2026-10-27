import type { AffiliateLink, Build, Part, Retailer } from '@/payload-types'

export type PartRow = {
  name: string
  category?: string
  quantity: number
  note?: string | null
  links: { retailer: string; url: string }[]
}

// Turn a build's parts list into display rows, attaching the active affiliate
// links of catalog parts. Free-text parts never get links.
export function resolveParts(parts: Build['parts'], affiliateLinks: AffiliateLink[]): PartRow[] {
  return (parts ?? []).map((row) => {
    const part = typeof row.part === 'object' ? (row.part as Part | null) : null
    const links = part
      ? affiliateLinks
          .filter((l) => l.active !== false && (typeof l.part === 'object' ? l.part.id : l.part) === part.id)
          .map((l) => ({ retailer: (l.retailer as Retailer).name, url: l.url }))
      : []
    return {
      name: part ? [part.brand, part.name].filter(Boolean).join(' ') : (row.freeText ?? ''),
      category: part?.category,
      quantity: row.quantity ?? 1,
      note: row.note,
      links,
    }
  })
}

export const hasAffiliateLinks = (rows: PartRow[]) => rows.some((r) => r.links.length > 0)

// Catalog part ids referenced by a build, for fetching their affiliate links.
export function catalogPartIds(parts: Build['parts']): number[] {
  return (parts ?? [])
    .map((row) => (typeof row.part === 'object' ? row.part?.id : row.part))
    .filter((id): id is number => typeof id === 'number')
}
