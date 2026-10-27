const STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'at', 'by'])

// Lowercase, strip accents and punctuation. Dots inside version numbers (4.5.1) are kept.
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d)\.(?=\d)/g, '$1§')
    .replace(/[^a-z0-9§]+/g, ' ')
    .replace(/§/g, '.')
    .trim()
}

function tokens(normalized: string): Set<string> {
  return new Set(normalized.split(' ').filter((t) => t && !STOPWORDS.has(t)))
}

// Jaccard similarity of the meaningful words in two normalized titles (0..1).
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.size || !tb.size) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / (ta.size + tb.size - shared)
}

// True when `normalized` matches one of `existing` exactly, or (for titles of
// 4+ words) shares at least `threshold` of its words with one of them.
export function isNearDuplicate(normalized: string, existing: string[], threshold = 0.8): boolean {
  const longEnough = tokens(normalized).size >= 4
  return existing.some(
    (other) => other === normalized || (longEnough && titleSimilarity(normalized, other) >= threshold),
  )
}
