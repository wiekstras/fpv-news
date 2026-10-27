import * as cheerio from 'cheerio'

// Canonical URL and preview image from an article page's <head>.
export function extractPageMeta(html: string, pageUrl: string): { canonicalUrl?: string; imageUrl?: string } {
  const $ = cheerio.load(html)
  const absolute = (href?: string) => {
    if (!href) return undefined
    try {
      return new URL(href, pageUrl).toString()
    } catch {
      return undefined
    }
  }
  return {
    canonicalUrl: absolute($('link[rel="canonical"]').attr('href')),
    imageUrl: absolute(
      $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content'),
    ),
  }
}
