import type { Payload } from 'payload'
import type { Marketplace } from '@/payload-types'

type MarketplaceSeed = Pick<Marketplace, 'name' | 'slug' | 'country' | 'currency' | 'searchUrl' | 'mode'>

// EU second-hand marketplaces without a dedicated adapter. Search URLs are best guesses that
// could not be checked from the build environment: run a search and fix any that report errors
// in Deals → Marketplaces. Sites behind bot protection will stop at a bot check.
const MARKETPLACES: MarketplaceSeed[] = [
  { name: 'Milanuncios', slug: 'milanuncios', country: 'ES', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.milanuncios.com/anuncios/?s={q}&desde={min}&hasta={max}&orden=date' },
  { name: 'CustoJusto', slug: 'custojusto', country: 'PT', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.custojusto.pt/portugal?q={q}' },
  { name: 'Allegro Lokalnie', slug: 'allegro-lokalnie', country: 'PL', currency: 'PLN', mode: 'browser', searchUrl: 'https://allegrolokalnie.pl/oferty/q/{q}' },
  { name: 'Jófogás', slug: 'jofogas', country: 'HU', currency: 'HUF', mode: 'http', searchUrl: 'https://www.jofogas.hu/magyarorszag?q={q}' },
  { name: 'Hardverapró', slug: 'hardverapro', country: 'HU', currency: 'HUF', mode: 'http', searchUrl: 'https://hardverapro.hu/aprok/keres.php?stext={q}' },
  { name: 'Blocket', slug: 'blocket', country: 'SE', currency: 'SEK', mode: 'browser', searchUrl: 'https://www.blocket.se/annonser/hela_sverige?q={q}' },
  { name: 'Tradera', slug: 'tradera', country: 'SE', currency: 'SEK', mode: 'browser', searchUrl: 'https://www.tradera.com/search?q={q}' },
  { name: 'DBA', slug: 'dba', country: 'DK', currency: 'DKK', mode: 'browser', searchUrl: 'https://www.dba.dk/recommerce/forsale/search?q={q}' },
  { name: 'Tori', slug: 'tori', country: 'FI', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.tori.fi/recommerce/forsale/search?q={q}' },
  { name: 'DoneDeal', slug: 'donedeal', country: 'IE', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.donedeal.ie/all?words={q}' },
  { name: 'Adverts.ie', slug: 'adverts-ie', country: 'IE', currency: 'EUR', mode: 'http', searchUrl: 'https://www.adverts.ie/for-sale/q_{q}/' },
  { name: 'Njuškalo', slug: 'njuskalo', country: 'HR', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.njuskalo.hr/search/?keywords={q}' },
  { name: 'Bolha', slug: 'bolha', country: 'SI', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.bolha.com/search/?keywords={q}' },
  { name: 'Skelbiu', slug: 'skelbiu', country: 'LT', currency: 'EUR', mode: 'http', searchUrl: 'https://www.skelbiu.lt/skelbimai/?keywords={q}' },
  { name: 'SS.com', slug: 'ss-com', country: 'LV', currency: 'EUR', mode: 'http', searchUrl: 'https://www.ss.com/en/search-result/?q={q}' },
  { name: 'Okidoki', slug: 'okidoki', country: 'EE', currency: 'EUR', mode: 'http', searchUrl: 'https://www.okidoki.ee/buy/all/?query={q}' },
  { name: 'Osta.ee', slug: 'osta-ee', country: 'EE', currency: 'EUR', mode: 'http', searchUrl: 'https://www.osta.ee/en/category?q%5Bq%5D={q}' },
  { name: 'xe.gr', slug: 'xe-gr', country: 'GR', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.xe.gr/en/search?q={q}' },
  { name: 'Shpock (AT)', slug: 'shpock-at', country: 'AT', currency: 'EUR', mode: 'browser', searchUrl: 'https://www.shpock.com/en-at/results?q={q}' },
  { name: 'markt.de', slug: 'markt-de', country: 'DE', currency: 'EUR', mode: 'http', searchUrl: 'https://www.markt.de/suche/?keywords={q}' },
  { name: 'Quoka', slug: 'quoka', country: 'DE', currency: 'EUR', mode: 'http', searchUrl: 'https://www.quoka.de/kleinanzeigen/cat_0_all/?search1={q}' },
  { name: '2ememain', slug: '2ememain', country: 'BE', currency: 'EUR', mode: 'http', searchUrl: 'https://www.2ememain.be/q/{q}/' },
  { name: 'Bazar.lu', slug: 'bazar-lu', country: 'LU', currency: 'EUR', mode: 'http', searchUrl: 'https://www.bazar.lu/Scripts/sql.exe?SqlDB=bazar&Sql=Search.phs&q={q}' },
  { name: 'Bazaraki', slug: 'bazaraki', country: 'CY', currency: 'EUR', mode: 'http', searchUrl: 'https://www.bazaraki.com/ads/?q={q}' },
  { name: 'Maltapark', slug: 'maltapark', country: 'MT', currency: 'EUR', mode: 'http', searchUrl: 'https://www.maltapark.com/listings?search={q}' },
]

// Adds marketplaces that aren't in the list yet (matched by slug); never changes existing rows.
export async function seedMarketplaces(payload: Payload) {
  for (const site of MARKETPLACES) {
    const { totalDocs } = await payload.count({ collection: 'marketplaces', where: { slug: { equals: site.slug } } })
    if (totalDocs > 0) continue
    await payload.create({
      collection: 'marketplaces',
      data: { ...site, enabled: true, permitted: false, notes: 'Search URL not verified yet: run a search and check Last result.' },
    })
  }
}
