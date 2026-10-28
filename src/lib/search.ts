import type { Where } from 'payload'

// Every word must appear in one of the fields (case-insensitive).
export function searchWhere(q: string, fields: string[]): Where | null {
  const words = q
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 6)
  if (words.length === 0) return null
  return { and: words.map((w) => ({ or: fields.map((f) => ({ [f]: { like: w } })) })) }
}
