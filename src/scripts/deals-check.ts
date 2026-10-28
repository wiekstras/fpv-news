// Live check for one deals adapter, without the database:
//   pnpm deals:check ebay "dji o3" NL,DE
//   pnpm deals:check marktplaats "fpv goggles"
//   pnpm deals:check kleinanzeigen "radiomaster" "" 300
//   DEALS_PERMITTED=1 pnpm deals:check vinted "dji goggles" NL   (skip robots.txt: only with the site's permission)
import { ADAPTERS } from '../lib/deals/adapters'
import { toolsFor } from '../lib/deals/search'
import type { DealSource } from '../lib/deals/options'

const [source, keywords, countries = '', maxPrice] = process.argv.slice(2)
const adapter = ADAPTERS[source as DealSource]
if (!adapter || !keywords) {
  console.error(`Usage: pnpm deals:check <${Object.keys(ADAPTERS).join('|')}> "<keywords>" [NL,DE] [maxPriceEur]`)
  process.exit(1)
}

const started = Date.now()
try {
  const listings = await adapter.search(
    { keywords, countries: countries ? countries.split(',') : [], maxPrice: maxPrice ? Number(maxPrice) : undefined },
    toolsFor(process.env.DEALS_PERMITTED === '1'),
  )
  console.log(`${source}: ${listings.length} listings in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  for (const l of listings.slice(0, 10)) {
    console.log(`- ${l.price ?? '?'} ${l.currency} | ${l.country} ${l.location ?? ''} | ${l.title}\n  ${l.url}`)
  }
  if (listings.length === 0) console.log('No listings: either nothing matches, or the page format changed (check the parser).')
} catch (err) {
  console.error(`${source} failed:`, err instanceof Error ? err.message : err)
  process.exit(2)
}
