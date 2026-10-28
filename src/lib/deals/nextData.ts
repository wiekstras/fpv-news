import * as cheerio from 'cheerio'

// Next.js sites embed the page's data as JSON in <script id="__NEXT_DATA__">.
export function nextData(html: string): any {
  const raw = cheerio.load(html)('script#__NEXT_DATA__').html()
  if (!raw) throw new Error('No __NEXT_DATA__ on the page (format changed?)')
  return JSON.parse(raw)
}

export const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}
