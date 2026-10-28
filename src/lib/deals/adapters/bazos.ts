import * as cheerio from 'cheerio'
import type { Adapter, Listing, SearchQuery } from '../types'

// Bazoš (CZ, SK): classic HTML search results.
const SITES: Record<string, { base: string; currency: string }> = {
  CZ: { base: 'https://www.bazos.cz', currency: 'CZK' },
  SK: { base: 'https://www.bazos.sk', currency: 'EUR' },
}

export function buildBazosUrl(query: SearchQuery, country: string) {
  const params = new URLSearchParams({
    hledat: query.keywords,
    rubriky: 'www',
    hlokalita: '',
    humkreis: '25',
    cenaod: '',
    cenado: '',
    Submit: 'Hledat',
    kitx: 'ano',
  })
  return `${SITES[country].base}/search.php?${params}`
}

// "4 500 Kč" → 4500, "120 €" → 120, "Dohodou" / "V textu" → null
export function parseBazosPrice(text: string): number | null {
  const digits = text.replace(/\s|&nbsp;| /g, '').match(/^(\d+)/)
  return digits ? Number(digits[1]) : null
}

export function parseBazos(html: string, country: string, pageUrl = SITES[country].base): Listing[] {
  const $ = cheerio.load(html)
  const listings: Listing[] = []
  $('div.inzeraty').each((_, el) => {
    const row = $(el)
    const link = row.find('h2.nadpis a').first()
    const href = link.attr('href')
    const title = link.text().trim()
    if (!href || !title) return
    const url = new URL(href, pageUrl).toString()
    const id = url.match(/\/inzerat\/(\d+)\//)?.[1] ?? url
    const date = row.find('span.velikost10').text().match(/(\d{1,2})\.(\d{1,2})\.\s*(\d{4})/)
    listings.push({
      source: 'bazos',
      externalId: `${country}:${id}`,
      title,
      price: parseBazosPrice(row.find('.inzeratycena').text()),
      currency: SITES[country].currency,
      location:
        cheerio
          .load((row.find('.inzeratylok').html() ?? '').replace(/<br\s*\/?>/gi, ' '))
          .text()
          .replace(/\s+/g, ' ')
          .trim() || undefined,
      country,
      url,
      image: row.find('img.obrazek').attr('src') || undefined,
      postedAt: date ? new Date(`${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}T12:00:00Z`) : undefined,
    })
  })
  return listings
}

export const bazos: Adapter = {
  source: 'bazos',
  countries: Object.keys(SITES),
  async search(query, { fetch }) {
    const countries = (query.countries.length ? query.countries : Object.keys(SITES)).filter((c) => c in SITES)
    const listings: Listing[] = []
    for (const country of countries) {
      const url = buildBazosUrl(query, country)
      listings.push(...parseBazos(await fetch(url, { headers: { accept: 'text/html' } }), country, url))
    }
    return listings
  },
}
