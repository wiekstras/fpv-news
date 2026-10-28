// Comma-separated keywords; true when none are set or any appears in the text (case-insensitive, whole words).
export function matchesAnyKeyword(text: string, keywords?: string | null): boolean {
  const words = (keywords ?? '')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
  if (words.length === 0) return true
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9.+]+/g, ' ')} `
  return words.some((w) => haystack.includes(` ${w.replace(/[^a-z0-9.+]+/g, ' ').trim()} `))
}

export const isGoogleNews = (url: string) => new URL(url).hostname === 'news.google.com'

// Google News titles end in " - Publisher"; drop it so the title matches the publisher's own feed.
export function cleanGoogleNewsTitle(title: string): string {
  return title.replace(/\s+-\s+[^-]{2,60}$/, '').trim()
}
