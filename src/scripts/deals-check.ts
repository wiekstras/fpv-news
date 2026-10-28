// Live check for one deals adapter, without the database:
//   pnpm deals:check ebay "dji o3" NL,DE
//   pnpm deals:check marktplaats "fpv goggles"
//   pnpm deals:check kleinanzeigen "radiomaster" "" 300
//   DEALS_PERMITTED=1 pnpm deals:check vinted "dji goggles" NL   (skip robots.txt: only with the site's permission)
// Any site from the Marketplaces list (generic adapter), with its search URL template:
//   pnpm deals:check site "https://www.jofogas.hu/magyarorszag?q={q}" "dji o3" HU
//   DEALS_MODE=browser pnpm deals:check site "https://www.blocket.se/annonser/hela_sverige?q={q}" "dji o3" SE
import { ADAPTERS } from '../lib/deals/adapters'
import { searchSite } from '../lib/deals/adapters/generic'
import type { DealSource } from '../lib/deals/options'
import { toolsFor } from '../lib/deals/search'
import type { Listing } from '../lib/deals/types'

const args = process.argv.slice(2)
const tools = toolsFor(process.env.DEALS_PERMITTED === '1')
const started = Date.now()

async function run(): Promise<{ name: string; listings: Listing[] }> {
  if (args[0] === 'site') {
    const [, searchUrl, keywords, country = 'NL'] = args
    if (!searchUrl || !keywords) throw new Error('Usage: pnpm deals:check site "<search url with {q}>" "<keywords>" [COUNTRY]')
    const site = { slug: 'check', name: new URL(searchUrl).hostname, country, currency: 'EUR', searchUrl, mode: process.env.DEALS_MODE === 'browser' ? ('browser' as const) : ('http' as const) }
    return { name: site.name, listings: await searchSite(site, { keywords, countries: [] }, tools) }
  }
  const [source, keywords, countries = '', maxPrice] = args
  const adapter = ADAPTERS[source as DealSource]
  if (!adapter || !keywords) {
    throw new Error(`Usage: pnpm deals:check <${Object.keys(ADAPTERS).join('|')}|site> "<keywords>" [NL,DE] [maxPriceEur]`)
  }
  const listings = await adapter.search(
    { keywords, countries: countries ? countries.split(',') : [], maxPrice: maxPrice ? Number(maxPrice) : undefined },
    tools,
  )
  return { name: source, listings }
}

try {
  const { name, listings } = await run()
  console.log(`${name}: ${listings.length} listings in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  for (const l of listings.slice(0, 10)) {
    console.log(`- ${l.price ?? '?'} ${l.currency} | ${l.country} ${l.location ?? ''} | ${l.title}\n  ${l.url}`)
  }
  if (listings.length === 0) console.log('No listings: either nothing matches, or the page format changed (check the parser).')
  process.exit(0)
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(2)
}
