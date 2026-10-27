// Chooses the digest's news: newest first, at most `perSource` items from one source.
export function pickNews<T extends { source: number | { id: number } }>(items: T[], limit = 8, perSource = 2): T[] {
  const counts = new Map<number, number>()
  const picked: T[] = []
  for (const item of items) {
    const id = typeof item.source === 'object' ? item.source.id : item.source
    if ((counts.get(id) ?? 0) >= perSource) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
    picked.push(item)
    if (picked.length === limit) break
  }
  return picked
}
