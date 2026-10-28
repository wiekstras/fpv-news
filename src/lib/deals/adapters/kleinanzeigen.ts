import * as cheerio from 'cheerio'
import { addDays, ymdInZone, zonedTime } from '../../time'
import type { Adapter, Listing, SearchQuery } from '../types'

// Kleinanzeigen (DE): parses the public search results page. No login, no cookies.
const BASE = 'https://www.kleinanzeigen.de'
const TZ = 'Europe/Berlin'

export function buildKleinanzeigenUrl(query: SearchQuery) {
  const slug = encodeURIComponent(query.keywords.trim().toLowerCase().replace(/\s+/g, '-'))
  const price = query.minPrice || query.maxPrice ? `s-preis:${query.minPrice ?? ''}:${query.maxPrice ?? ''}/` : 's-'
  return `${BASE}/${price}${slug}/k0`
}

// "1.250 € VB" → 1250, "Zu verschenken" → 0, "VB" → null
export function parseGermanPrice(text: string): number | null {
  if (/verschenken/i.test(text)) return 0
  const m = text.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?\s*€/)
  return m ? Number(m[1].replace(/\./g, '')) + (m[2] ? Number(m[2].padEnd(2, '0')) / 100 : 0) : null
}

// "Heute, 14:05" / "Gestern, 09:12" / "27.10.2026" (Berlin time) → Date
export function parseGermanDate(text: string, now = new Date()): Date | undefined {
  const t = text.trim()
  const time = t.match(/(\d{1,2}):(\d{2})/)
  let day: string | undefined
  if (/^heute/i.test(t)) day = ymdInZone(now, TZ)
  else if (/^gestern/i.test(t)) day = addDays(ymdInZone(now, TZ), -1)
  else {
    const m = t.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (m) day = `${m[3]}-${m[2]}-${m[1]}`
  }
  if (!day) return undefined
  return zonedTime(day, time ? `${time[1].padStart(2, '0')}:${time[2]}` : '12:00', TZ)
}

export function parseKleinanzeigen(html: string, now = new Date()): Listing[] {
  const $ = cheerio.load(html)
  const listings: Listing[] = []
  $('article.aditem').each((_, el) => {
    const item = $(el)
    const id = item.attr('data-adid')
    const link = item.find('h2 a').first()
    const href = item.attr('data-href') || link.attr('href')
    const title = link.text().trim()
    if (!id || !href || !title) return
    const img = item.find('.aditem-image img').first()
    listings.push({
      source: 'kleinanzeigen',
      externalId: id,
      title,
      price: parseGermanPrice(item.find('.aditem-main--middle--price-shipping--price').text()),
      currency: 'EUR',
      location: item.find('.aditem-main--top--left').text().replace(/\s+/g, ' ').trim() || undefined,
      country: 'DE',
      url: new URL(href, BASE).toString(),
      image: img.attr('src') || img.attr('data-imgsrc') || undefined,
      postedAt: parseGermanDate(item.find('.aditem-main--top--right').text(), now),
    })
  })
  return listings
}

export const kleinanzeigen: Adapter = {
  source: 'kleinanzeigen',
  countries: ['DE'],
  async search(query, { fetch }) {
    if (query.countries.length && !query.countries.includes('DE')) return []
    return parseKleinanzeigen(await fetch(buildKleinanzeigenUrl(query), { headers: { accept: 'text/html' } }))
  },
}
