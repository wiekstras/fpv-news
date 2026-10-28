import * as cheerio from 'cheerio'
import { toNumber } from './nextData'

export type StructuredItem = { name: string; url: string; price: number | null; currency?: string; image?: string }

const asArray = <T>(v: T | T[] | undefined | null): T[] => (Array.isArray(v) ? v : v == null ? [] : [v])
const typeOf = (node: any): string[] => asArray(node?.['@type']).map(String)
const firstString = (v: any): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? firstString(v[0]) : typeof v?.url === 'string' ? v.url : undefined

function fromProduct(node: any, fallbackUrl?: string): StructuredItem | null {
  const offer = asArray(node.offers).flatMap((o: any) => (typeOf(o).includes('AggregateOffer') ? [{ price: o.lowPrice, priceCurrency: o.priceCurrency }] : [o]))[0]
  const url = firstString(node.url) ?? firstString(offer?.url) ?? fallbackUrl
  const name = typeof node.name === 'string' ? node.name.trim() : undefined
  if (!url || !name) return null
  return {
    name,
    url,
    price: toNumber(offer?.price ?? offer?.priceSpecification?.price),
    currency: offer?.priceCurrency ?? offer?.priceSpecification?.priceCurrency,
    image: firstString(node.image),
  }
}

// Listings described with schema.org on a search page: JSON-LD ItemList / Product / Offer,
// or microdata (itemtype=".../Product"). Many marketplaces include one of these for search engines.
export function extractListings(html: string, pageUrl: string): StructuredItem[] {
  const $ = cheerio.load(html)
  const items: StructuredItem[] = []

  const visit = (node: any, fallbackUrl?: string) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach((n) => visit(n))
    const types = typeOf(node)
    if (types.includes('ItemList')) {
      for (const el of asArray(node.itemListElement)) {
        const item = el?.item ?? el
        visit(typeof item === 'object' ? item : null, firstString(el?.url))
      }
    } else if (types.some((t) => ['Product', 'IndividualProduct', 'Car', 'Vehicle'].includes(t))) {
      const found = fromProduct(node, fallbackUrl)
      if (found) items.push(found)
    } else if (types.includes('Offer') && node.itemOffered) {
      const found = fromProduct({ ...node.itemOffered, offers: node, url: node.url ?? node.itemOffered.url }, fallbackUrl)
      if (found) items.push(found)
    }
    if (node['@graph']) visit(node['@graph'])
  }

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).html() ?? ''))
    } catch {
      // ignore malformed blocks
    }
  })

  if (items.length === 0) {
    $('[itemtype*="schema.org/Product"]').each((_, el) => {
      const p = $(el)
      const prop = (name: string) => p.find(`[itemprop="${name}"]`).first()
      const name = prop('name').attr('content') ?? prop('name').text().trim()
      const url = prop('url').attr('href') ?? prop('url').attr('content') ?? p.find('a[href]').first().attr('href')
      if (!name || !url) return
      items.push({
        name,
        url,
        price: toNumber(prop('price').attr('content') ?? prop('price').text().replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}\b)/g, '')),
        currency: prop('priceCurrency').attr('content'),
        image: prop('image').attr('src') ?? prop('image').attr('content'),
      })
    })
  }

  // Absolute URLs, one entry per listing URL.
  const seen = new Set<string>()
  return items
    .map((i) => ({ ...i, url: new URL(i.url, pageUrl).toString(), image: i.image ? new URL(i.image, pageUrl).toString() : undefined }))
    .filter((i) => !seen.has(i.url) && seen.add(i.url))
}
