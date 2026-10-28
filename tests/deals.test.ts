import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { buildEbayUrl, parseEbay } from '@/lib/deals/adapters/ebay'
import {
  buildKleinanzeigenUrl,
  parseGermanDate,
  parseGermanPrice,
  parseKleinanzeigen,
} from '@/lib/deals/adapters/kleinanzeigen'
import { buildMarktplaatsUrl, parseMarktplaats } from '@/lib/deals/adapters/marktplaats'
import { parseEcbRates, toEur } from '@/lib/deals/fx'
import { isAllowed, parseRobots } from '@/lib/deals/robots'
import { matchesSearch } from '@/lib/deals/match'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/deals/${name}`, import.meta.url), 'utf8')

describe('eBay adapter', () => {
  it('maps Browse API item summaries to listings', () => {
    const [first, second] = parseEbay(fixture('ebay-search.json'), 'DE')
    expect(first).toEqual({
      source: 'ebay',
      externalId: 'v1|186123456789|0',
      title: 'DJI O3 Air Unit – gebraucht, voll funktionsfähig',
      price: 149,
      currency: 'EUR',
      location: '10115',
      country: 'DE',
      url: 'https://www.ebay.de/itm/186123456789',
      image: 'https://i.ebayimg.com/images/g/abc/s-l225.jpg',
      postedAt: new Date('2026-10-26T18:21:04.000Z'),
    })
    expect(second).toMatchObject({ price: 95.5, location: '80331 München', image: 'https://i.ebayimg.com/images/g/def/s-l1600.jpg' })
    expect(second.postedAt).toBeUndefined()
  })

  it('returns nothing for an empty result', () => {
    expect(parseEbay('{"total":0}', 'NL')).toEqual([])
  })

  it('filters by country, used condition and EUR price range', () => {
    const url = new URL(buildEbayUrl({ keywords: 'dji o3', maxPrice: 200, countries: [] }, 'NL'))
    expect(url.pathname).toBe('/buy/browse/v1/item_summary/search')
    expect(url.searchParams.get('q')).toBe('dji o3')
    expect(url.searchParams.get('filter')).toBe('itemLocationCountry:NL,conditions:{USED|UNSPECIFIED},price:[..200],priceCurrency:EUR')
    expect(url.searchParams.get('sort')).toBe('newlyListed')
  })

  it('leaves the price filter out on non-EUR sites', () => {
    const url = new URL(buildEbayUrl({ keywords: 'goggles', maxPrice: 200, countries: [] }, 'GB'))
    expect(url.searchParams.get('filter')).toBe('itemLocationCountry:GB,conditions:{USED|UNSPECIFIED}')
  })
})

describe('Marktplaats / 2dehands adapter', () => {
  it('maps listings, skipping incomplete ones', () => {
    const listings = parseMarktplaats(fixture('marktplaats-search.json'), 'NL')
    expect(listings).toHaveLength(2)
    expect(listings[0]).toEqual({
      source: 'marktplaats',
      externalId: 'm2123456789',
      title: 'DJI Goggles 2 + O3 air unit',
      price: 325,
      currency: 'EUR',
      location: 'Utrecht',
      country: 'NL',
      url: 'https://www.marktplaats.nl/v/hobby-en-vrije-tijd/modelbouw-radiografisch-vliegtuigen/m2123456789-dji-goggles-2-o3-air-unit',
      image: 'https://images.marktplaats.com/api/v1/listing-mp-p/images/aa/aa111.jpg?rule=ecg_mp_eps$_82',
      postedAt: new Date('2026-10-27T09:12:00Z'),
    })
  })

  it('treats "see description" prices as unknown and relative dates as missing', () => {
    const [, second] = parseMarktplaats(fixture('marktplaats-search.json'), 'NL')
    expect(second).toMatchObject({ price: null, country: 'BE', postedAt: undefined, image: undefined })
  })

  it('uses the 2dehands domain for Belgium', () => {
    expect(buildMarktplaatsUrl({ keywords: 'fpv', countries: [] }, 'BE')).toMatch(/^https:\/\/www\.2dehands\.be\/lrp\/api\/search\?query=fpv&/)
  })
})

describe('Kleinanzeigen adapter', () => {
  const now = new Date('2026-10-27T15:00:00Z')

  it('parses result cards and skips non-ad rows', () => {
    const listings = parseKleinanzeigen(fixture('kleinanzeigen-search.html'), now)
    expect(listings).toHaveLength(2)
    expect(listings[0]).toEqual({
      source: 'kleinanzeigen',
      externalId: '2901234567',
      title: 'DJI O3 Air Unit wie neu',
      price: 1250,
      currency: 'EUR',
      location: '10115 Mitte',
      country: 'DE',
      url: 'https://www.kleinanzeigen.de/s-anzeige/dji-o3-air-unit-wie-neu/2901234567-225-3331',
      image: 'https://img.kleinanzeigen.de/api/v1/prod-ads/images/aa/aa1?rule=$_2.JPG',
      postedAt: new Date('2026-10-27T13:05:00Z'), // 14:05 in Berlin (CET, UTC+1)
    })
    expect(listings[1]).toMatchObject({ price: null, image: 'https://img.kleinanzeigen.de/api/v1/prod-ads/images/bb/bb2?rule=$_2.JPG' })
    expect(listings[1].postedAt?.toISOString()).toBe('2026-10-25T11:00:00.000Z') // noon CET (DST ended that night)
  })

  it('parses German prices', () => {
    expect(parseGermanPrice('120 €')).toBe(120)
    expect(parseGermanPrice('1.250 € VB')).toBe(1250)
    expect(parseGermanPrice('99,50 €')).toBe(99.5)
    expect(parseGermanPrice('Zu verschenken')).toBe(0)
    expect(parseGermanPrice('VB')).toBeNull()
  })

  it('parses relative German dates in Berlin time', () => {
    expect(parseGermanDate('Gestern, 09:12', now)?.toISOString()).toBe('2026-10-26T08:12:00.000Z')
    expect(parseGermanDate('irgendwann', now)).toBeUndefined()
  })

  it('builds search URLs with an optional price range', () => {
    expect(buildKleinanzeigenUrl({ keywords: 'DJI O3', countries: [] })).toBe('https://www.kleinanzeigen.de/s-dji-o3/k0')
    expect(buildKleinanzeigenUrl({ keywords: 'goggles', maxPrice: 300, countries: [] })).toBe(
      'https://www.kleinanzeigen.de/s-preis::300/goggles/k0',
    )
  })
})

describe('robots.txt', () => {
  const txt = `
User-agent: *
Disallow: /admin
Disallow: /*?*sort=
Allow: /admin/public
Disallow: /private$

User-agent: FPVNewsDealsBot
Disallow: /lrp/api/

User-agent: BadBot
Disallow: /
`
  it('applies the * group with longest-match precedence and wildcards', () => {
    const rules = parseRobots(txt, 'SomeOtherBot')
    expect(isAllowed(rules, '/s-dji/k0')).toBe(true)
    expect(isAllowed(rules, '/admin/settings')).toBe(false)
    expect(isAllowed(rules, '/admin/public/page')).toBe(true)
    expect(isAllowed(rules, '/search?q=x&sort=new')).toBe(false)
    expect(isAllowed(rules, '/private')).toBe(false)
    expect(isAllowed(rules, '/private/ok')).toBe(true)
  })

  it('uses a group that names our bot instead of *', () => {
    const rules = parseRobots(txt, 'FPVNewsDealsBot')
    expect(isAllowed(rules, '/lrp/api/search?query=fpv')).toBe(false)
    expect(isAllowed(rules, '/admin')).toBe(true)
  })

  it('allows everything for an empty robots.txt', () => {
    expect(isAllowed(parseRobots('', 'FPVNewsDealsBot'), '/anything')).toBe(true)
  })
})

describe('EUR conversion', () => {
  const { date, rates } = parseEcbRates(fixture('ecb-daily.xml'))

  it('parses ECB reference rates', () => {
    expect(date).toBe('2026-10-27')
    expect(rates).toMatchObject({ EUR: 1, GBP: 0.835, PLN: 4.302 })
  })

  it('converts to EUR and keeps unknowns as null', () => {
    expect(toEur(100, 'EUR', rates)).toBe(100)
    expect(toEur(83.5, 'GBP', rates)).toBe(100)
    expect(toEur(430.2, 'PLN', rates)).toBe(100)
    expect(toEur(10, 'XYZ', rates)).toBeNull()
    expect(toEur(null, 'EUR', rates)).toBeNull()
  })
})

describe('matchesSearch', () => {
  const listing = { title: 'DJI O3 Air Unit', country: 'DE' }

  it('applies the EUR price range', () => {
    expect(matchesSearch(listing, 150, { minPrice: 100, maxPrice: 200 })).toBe(true)
    expect(matchesSearch(listing, 250, { maxPrice: 200 })).toBe(false)
    expect(matchesSearch(listing, 50, { minPrice: 100 })).toBe(false)
  })

  it('keeps listings without a price only when no range is set', () => {
    expect(matchesSearch(listing, null, {})).toBe(true)
    expect(matchesSearch(listing, null, { maxPrice: 200 })).toBe(false)
  })

  it('filters on country and exclude words', () => {
    expect(matchesSearch(listing, 150, { countries: ['NL'] })).toBe(false)
    expect(matchesSearch(listing, 150, { countries: ['DE', 'NL'] })).toBe(true)
    expect(matchesSearch({ title: 'DJI O3 defekt', country: 'DE' }, 150, { excludeKeywords: 'kapot, defekt' })).toBe(false)
  })
})

describe('new price and discount', () => {
  it('estimates the new price from eBay new listings, ignoring accessories and bundles', async () => {
    const { parseEbayPrices } = await import('@/lib/deals/adapters/ebay')
    const { marketPrice } = await import('@/lib/deals/reference')
    const prices = parseEbayPrices(fixture('ebay-new-prices.json'))
    expect(prices).toHaveLength(8) // the GBP item is left out
    expect(marketPrice(prices)).toBe(209)
  })

  it('needs at least three prices', async () => {
    const { marketPrice } = await import('@/lib/deals/reference')
    expect(marketPrice([100, 120])).toBeNull()
    expect(marketPrice([100, 120, 0])).toBeNull()
    expect(marketPrice([100, 110, 120])).toBe(110)
  })

  it('computes % below new, negative when pricier than new', async () => {
    const { discountPct } = await import('@/lib/deals/reference')
    expect(discountPct(149, 209)).toBe(29)
    expect(discountPct(250, 200)).toBe(-25)
    expect(discountPct(null, 200)).toBeNull()
    expect(discountPct(100, null)).toBeNull()
  })

  it('asks eBay.de for new, buy-it-now items in EUR', async () => {
    const { buildEbayNewPriceUrl } = await import('@/lib/deals/adapters/ebay')
    const url = new URL(buildEbayNewPriceUrl('dji o3'))
    expect(url.searchParams.get('q')).toBe('dji o3')
    expect(url.searchParams.get('filter')).toBe('conditions:{NEW},buyingOptions:{FIXED_PRICE},priceCurrency:EUR')
  })
})

describe('browser-based adapters', () => {
  it('leboncoin: reads ads from the Next.js page data', async () => {
    const { buildLeboncoinUrl, parseLeboncoin } = await import('@/lib/deals/adapters/leboncoin')
    const [first, second, ...rest] = parseLeboncoin(fixture('leboncoin-search.html'))
    expect(rest).toEqual([])
    expect(first).toEqual({
      source: 'leboncoin',
      externalId: '2871234567',
      title: 'DJI O3 Air Unit comme neuf',
      price: 140,
      currency: 'EUR',
      location: '75011 Paris',
      country: 'FR',
      url: 'https://www.leboncoin.fr/ad/modelisme/2871234567',
      image: 'https://img.leboncoin.fr/api/v1/lbcpb1/images/aa/ad-image.jpg',
      postedAt: new Date('2026-10-27T13:05:00Z'), // 14:05 Paris (CET)
    })
    expect(second).toMatchObject({ price: null, image: undefined, location: 'Lyon' })
    expect(buildLeboncoinUrl({ keywords: 'dji o3', maxPrice: 200, countries: [] })).toBe(
      'https://www.leboncoin.fr/recherche?text=dji+o3&sort=time&order=desc&price=min-200',
    )
  })

  it('Subito: reads items from the Next.js page data, skipping ads and incomplete items', async () => {
    const { buildSubitoUrl, parseSubito } = await import('@/lib/deals/adapters/subito')
    const items = parseSubito(fixture('subito-search.html'))
    expect(items).toEqual([
      {
        source: 'subito',
        externalId: '543210987',
        title: 'Radiocomando RadioMaster TX16S MKII',
        price: 220,
        currency: 'EUR',
        location: 'Milano',
        country: 'IT',
        url: 'https://www.subito.it/modellismo/radiocomando-radiomaster-tx16s-milano-543210987.htm',
        image: 'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/ab/abc123',
        postedAt: new Date('2026-10-27T17:42:00Z'),
      },
    ])
    expect(buildSubitoUrl({ keywords: 'tx16s', minPrice: 50, maxPrice: 300, countries: [] })).toBe(
      'https://www.subito.it/annunci-italia/vendita/usato/?q=tx16s&order=datedesc&ps=50&pe=300',
    )
  })

  it('Vinted: maps catalog API items (new and old price formats)', async () => {
    const { buildVintedUrl, parseVinted } = await import('@/lib/deals/adapters/vinted')
    const items = parseVinted(JSON.parse(fixture('vinted-catalog.json')), 'NL')
    expect(items[0]).toEqual({
      source: 'vinted',
      externalId: '5123456789',
      title: 'DJI Goggles 2',
      price: 280,
      currency: 'EUR',
      country: 'NL',
      url: 'https://www.vinted.nl/items/5123456789-dji-goggles-2',
      image: 'https://images1.vinted.net/t/01_aa/f800/abc.jpeg',
    })
    expect(items[1]).toMatchObject({ price: 15, url: 'https://www.vinted.nl/items/5100000001-fpv-drone-frame', image: undefined })
    expect(buildVintedUrl({ keywords: 'goggles', maxPrice: 300, countries: [] }, 'DE')).toBe(
      'https://www.vinted.de/catalog?search_text=goggles&order=newest_first&price_to=300',
    )
  })

  it('Wallapop: maps search API items in both response shapes', async () => {
    const { buildWallapopUrl, parseWallapop } = await import('@/lib/deals/adapters/wallapop')
    expect(parseWallapop(JSON.parse(fixture('wallapop-search.json')))).toEqual([
      {
        source: 'wallapop',
        externalId: '8j3m5xk2pqz7',
        title: 'Gafas FPV Walksnail Avatar',
        price: 210,
        currency: 'EUR',
        location: 'Madrid',
        country: 'ES',
        url: 'https://es.wallapop.com/item/gafas-fpv-walksnail-avatar-1023456789',
        image: 'https://cdn.wallapop.com/images/m.jpg',
        postedAt: new Date(1761580800000),
      },
    ])
    expect(parseWallapop(JSON.parse(fixture('wallapop-search-v2.json')))[0]).toMatchObject({
      price: 95.5,
      url: 'https://es.wallapop.com/item/dron-fpv-5-pulgadas-998877',
      image: 'https://cdn.wallapop.com/images/s2.jpg',
    })
    expect(parseWallapop({})).toEqual([])
    expect(buildWallapopUrl({ keywords: 'gafas fpv', countries: [] })).toBe(
      'https://es.wallapop.com/app/search?keywords=gafas+fpv&order_by=newest',
    )
  })

  it('throws a clear error when a page has no Next.js data', async () => {
    const { parseLeboncoin } = await import('@/lib/deals/adapters/leboncoin')
    expect(() => parseLeboncoin('<html><body>changed</body></html>')).toThrow(/__NEXT_DATA__/)
  })
})

describe('OLX, willhaben and Bazoš adapters', () => {
  it('OLX: maps API offers with local currency and sized photo URLs', async () => {
    const { buildOlxUrl, parseOlx } = await import('@/lib/deals/adapters/olx')
    const [first, second] = parseOlx(fixture('olx-offers.json'), 'PL')
    expect(first).toEqual({
      source: 'olx',
      externalId: 'PL:901234567',
      title: 'DJI O3 Air Unit jak nowy',
      price: 650,
      currency: 'PLN',
      location: 'Warszawa',
      country: 'PL',
      url: 'https://www.olx.pl/d/oferta/dji-o3-air-unit-CID99-IDabc.html',
      image: 'https://ireland.apollo.olxcdn.com:443/v1/files/abc123/image;s=400x300',
      postedAt: new Date('2026-10-27T13:05:22Z'),
    })
    expect(second).toMatchObject({ price: null, currency: 'EUR', image: undefined })
    expect(buildOlxUrl({ keywords: 'dji o3', countries: [] }, 'RO')).toBe(
      'https://www.olx.ro/api/v1/offers/?offset=0&limit=40&query=dji+o3&sort_by=created_at%3Adesc',
    )
  })

  it('willhaben: reads adverts from the Next.js page data', async () => {
    const { buildWillhabenUrl, parseWillhaben } = await import('@/lib/deals/adapters/willhaben')
    expect(parseWillhaben(fixture('willhaben-search.html'))).toEqual([
      {
        source: 'willhaben',
        externalId: '1234567890',
        title: 'DJI O3 Air Unit, kaum benutzt',
        price: 160,
        currency: 'EUR',
        location: '1070 Wien, 07. Bezirk, Neubau',
        country: 'AT',
        url: 'https://www.willhaben.at/iad/d/kaufen-und-verkaufen/dji-o3-air-unit-1234567890/',
        image: 'https://cache.willhaben.at/mmo/9/1/2/3/4_123456789.jpg',
        postedAt: new Date('2026-10-27T13:05:00Z'),
      },
    ])
    expect(buildWillhabenUrl({ keywords: 'dji o3', maxPrice: 200, countries: [] })).toBe(
      'https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=dji+o3&sort=1&rows=60&PRICE_TO=200',
    )
  })

  it('Bazoš: parses result rows with CZK prices, "by agreement" and relative links', async () => {
    const { parseBazos, parseBazosPrice } = await import('@/lib/deals/adapters/bazos')
    const [first, second] = parseBazos(fixture('bazos-search.html'), 'CZ', 'https://www.bazos.cz/search.php?hledat=dji')
    expect(first).toEqual({
      source: 'bazos',
      externalId: 'CZ:187654321',
      title: 'DJI O3 Air Unit',
      price: 4500,
      currency: 'CZK',
      location: 'Praha 110 00',
      country: 'CZ',
      url: 'https://elektro.bazos.cz/inzerat/187654321/dji-o3-air-unit.php',
      image: 'https://www.bazos.cz/img/1t/321/187654321.jpg',
      postedAt: new Date('2026-10-27T12:00:00Z'),
    })
    expect(second).toMatchObject({ price: null, url: 'https://www.bazos.cz/inzerat/187654999/radiomaster.php', postedAt: new Date('2026-09-01T12:00:00Z') })
    expect(parseBazosPrice('120 €')).toBe(120)
    expect(parseBazosPrice('V textu')).toBeNull()
  })
})

describe('generic marketplace adapter (schema.org data)', () => {
  const site = { slug: 'site', name: 'Site', country: 'SE', currency: 'SEK', mode: 'http' as const, searchUrl: 'https://site.example/search?q={q}&max={max}' }

  it('builds the search URL from the template', async () => {
    const { buildSiteUrl } = await import('@/lib/deals/adapters/generic')
    expect(buildSiteUrl(site.searchUrl, { keywords: 'dji o3', maxPrice: 300, countries: [] })).toBe('https://site.example/search?q=dji%20o3&max=300')
    expect(buildSiteUrl(site.searchUrl, { keywords: 'x', countries: [] })).toBe('https://site.example/search?q=x&max=')
  })

  it('reads JSON-LD item lists (ListItem urls, offer arrays, aggregate offers), dedupes, skips broken blocks', async () => {
    const { listingsFromPage } = await import('@/lib/deals/adapters/generic')
    const listings = listingsFromPage(site, fixture('generic-itemlist.html'), 'https://site.example/search?q=x')
    expect(listings.map((l) => [l.title, l.price, l.currency, l.url])).toEqual([
      ['FPV Goggles', 120, 'EUR', 'https://site.example/ad/111'],
      ['Radio TX16S', 90, 'EUR', 'https://site.example/ad/222'],
      ['Bundle', 55, 'SEK', 'https://site.example/ad/333'],
    ])
    expect(listings[0]).toMatchObject({ source: 'other', marketplace: 'Site', country: 'SE', image: 'https://site.example/img/111.jpg', externalId: 'site:https://site.example/ad/111' })
  })

  it('reads Offers inside @graph and microdata products', async () => {
    const { extractListings } = await import('@/lib/deals/structuredData')
    expect(extractListings(fixture('generic-graph.html'), 'https://site.example/')).toEqual([
      { name: 'Tinyhawk', url: 'https://site.example/ad/9', price: 45, currency: 'DKK', image: 'https://site.example/9.jpg' },
    ])
    expect(extractListings(fixture('generic-microdata.html'), 'https://hu.example/s')).toEqual([
      { name: 'Walksnail Avatar Kit', url: 'https://hu.example/item/5', price: 1250.5, currency: 'HUF', image: 'https://hu.example/5.jpg' },
    ])
  })

  it('reports pages without structured data instead of returning nothing silently', async () => {
    const { searchSite } = await import('@/lib/deals/adapters/generic')
    const tools = { fetch: async () => '<html><body>no data</body></html>', browser: async () => ({ html: '' }) }
    await expect(searchSite(site, { keywords: 'x', countries: [] }, tools)).rejects.toThrow(/structured data/)
    expect(await searchSite(site, { keywords: 'x', countries: ['NL'] }, tools)).toEqual([])
  })
})
