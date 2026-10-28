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
