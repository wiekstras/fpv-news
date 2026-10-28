import type { Payload } from 'payload'
import type { Listing as ListingDoc, Marketplace, SavedSearch } from '@/payload-types'
import { fetchText } from '../http'
import { ebayNewPrices } from './adapters/ebay'
import { parseEcbRates, toEur } from './fx'
import { HttpError, politeFetch } from './http'
import { matchesSearch } from './match'
import { searchSites, searchSource, toolsFor } from './search'
import { DEAL_SOURCES, type DealSource } from './options'
import { pausedKeys, recordHealth } from './health'
import { dealWarning, findDuplicate } from './quality'
import { discountPct, marketPrice } from './reference'
import { distanceKm, geocode } from '../geo'
import { pushConfigured, sendPush } from '../notify'
import type { Listing, SearchQuery } from './types'
import { SITE_URL } from '../site'

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
const SITE = SITE_URL
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// The new price a search's listings are compared against: the manual value if set, otherwise
// the eBay.de median of new listings, refreshed at most once a day.
export async function referencePrice(payload: Payload, search: SavedSearch): Promise<number | null> {
  if (search.referencePrice) return search.referencePrice
  const fresh = search.marketPriceAt && Date.now() - new Date(search.marketPriceAt).getTime() < DAY
  if (fresh || !process.env.EBAY_CLIENT_ID) return search.marketPrice ?? null
  try {
    const prices = await ebayNewPrices(search.keywords, politeFetch)
    const price = marketPrice(prices)
    await payload.update({
      collection: 'saved-searches',
      id: search.id,
      data: { marketPrice: price, marketPriceCount: prices.length, marketPriceAt: new Date().toISOString() },
    })
    return price
  } catch (err) {
    payload.logger.warn({ err, search: search.name }, 'New price lookup on eBay failed')
    return search.marketPrice ?? null
  }
}

export async function refreshFxRates(payload: Payload) {
  const { date, rates } = parseEcbRates(await fetchText(ECB_URL))
  for (const [currency, rate] of Object.entries(rates)) {
    const { docs } = await payload.find({ collection: 'fx-rates', where: { currency: { equals: currency } }, limit: 1 })
    if (docs[0]) await payload.update({ collection: 'fx-rates', id: docs[0].id, data: { rate, date } })
    else await payload.create({ collection: 'fx-rates', data: { currency, rate, date } })
  }
  return Object.keys(rates).length
}

export async function loadRates(payload: Payload) {
  let { docs } = await payload.find({ collection: 'fx-rates', pagination: false })
  if (docs.length === 0) {
    try {
      await refreshFxRates(payload)
      ;({ docs } = await payload.find({ collection: 'fx-rates', pagination: false }))
    } catch (err) {
      payload.logger.warn({ err }, 'Could not load ECB rates; non-EUR prices stay unconverted')
    }
  }
  return Object.fromEntries([['EUR', 1], ...docs.map((d) => [d.currency, d.rate])]) as Record<string, number>
}

export type RunResult = { search: string; source: string; found?: number; new?: number; error?: string }

type Alert = { listing: ListingDoc; search: SavedSearch; reason: 'new' | 'drop'; oldPriceEur?: number | null }

let running = false

// Runs saved searches against every enabled source and stores new listings. Scheduled runs only
// take searches that are due (runEveryHours); `force` (Run now) takes every active search.
// Only one run at a time: a run that starts while another is busy does nothing.
export async function runDealSearches(payload: Payload, opts: { searchId?: number; force?: boolean } = {}): Promise<RunResult[]> {
  if (running) {
    payload.logger.info('Deals radar run skipped: another run is still busy')
    return []
  }
  running = true
  try {
    return await runSearches(payload, opts)
  } finally {
    running = false
  }
}

export const isDue = (search: Pick<SavedSearch, 'lastRunAt' | 'runEveryHours'>, now = Date.now()) =>
  !search.lastRunAt || now - new Date(search.lastRunAt).getTime() >= (search.runEveryHours ?? 3) * HOUR - 5 * 60 * 1000

async function runSearches(payload: Payload, opts: { searchId?: number; force?: boolean }) {
  const settings = await payload.findGlobal({ slug: 'settings' })
  const enabled = new Set((settings.enabledDealSources ?? []) as DealSource[])
  const permitted = new Set((settings.permittedDealSources ?? []) as DealSource[])
  const home = settings.homeLat != null && settings.homeLon != null ? { lat: settings.homeLat, lon: settings.homeLon } : null
  const paused = await pausedKeys(payload)
  const rates = await loadRates(payload)
  const { docs: allSearches } = await payload.find({
    collection: 'saved-searches',
    where: opts.searchId ? { id: { equals: opts.searchId } } : { active: { equals: true } },
    pagination: false,
  })
  const searches = opts.force || opts.searchId ? allSearches : allSearches.filter((s) => isDue(s))

  const { docs: allSites } = await payload.find({
    collection: 'marketplaces',
    where: { enabled: { equals: true } },
    pagination: false,
    depth: 0,
  })
  const sites = allSites.filter((site) => !paused.has(`site:${site.slug}`))
  const results: RunResult[] = []
  const alerts: Alert[] = []

  for (const search of searches) {
    const reference = await referencePrice(payload, search)
    const wanted = (search.sources?.length ? search.sources : [...enabled]) as DealSource[]
    for (const source of wanted.filter((s) => enabled.has(s) && !paused.has(s))) {
      const query = { keywords: search.keywords, minPrice: search.minPrice, maxPrice: search.maxPrice, countries: search.countries ?? [] }
      try {
        const found =
          source === 'other' ? await searchOtherSites(payload, sites, query) : await searchSource(source, query, permitted.has(source))
        if (source !== 'other') await recordHealth(payload, source, sourceLabel(source), { found: found.length })
        let created = 0
        for (const listing of found) {
          const priceEur = toEur(listing.price, listing.currency, rates)
          if (!matchesSearch(listing, priceEur, search)) continue
          const place = await locate(payload, listing, home)
          if (search.maxDistanceKm && place?.distanceKm != null && place.distanceKm > search.maxDistanceKm) continue
          const outcome = await upsertListing(payload, listing, priceEur, reference, search.id, place)
          if (outcome.created) {
            created++
            const doc = outcome.created
            const cheap = search.alertBelow != null && priceEur != null && priceEur <= search.alertBelow
            const bigDiscount = search.alertDiscount != null && doc.discountPct != null && doc.discountPct >= search.alertDiscount
            if ((cheap || bigDiscount) && !doc.duplicateOf) alerts.push({ listing: doc, search, reason: 'new' })
          }
          if (outcome.priceDrop) alerts.push({ listing: outcome.priceDrop.listing, search, reason: 'drop', oldPriceEur: outcome.priceDrop.from })
        }
        results.push({ search: search.name, source, found: found.length, new: created })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        if (source !== 'other') await recordHealth(payload, source, sourceLabel(source), { error })
        results.push({ search: search.name, source, error })
      }
    }
    const lastResult = results
      .filter((r) => r.search === search.name)
      .map((r) => `${r.source}: ${r.error ? `ERROR ${r.error}` : `${r.found} found, ${r.new} new`}`)
      .join('\n')
    await payload.update({
      collection: 'saved-searches',
      id: search.id,
      data: { lastRunAt: new Date().toISOString(), lastResult: lastResult || 'No enabled sources for this search' },
    })
  }

  if (alerts.length) await sendAlerts(payload, settings.adminEmail, alerts)
  return results
}

const sourceLabel = (source: DealSource) => DEAL_SOURCES.find((s) => s.value === source)?.label ?? source

// Coordinates and distance from home, when both are known (geocoded via the cache).
async function locate(payload: Payload, listing: Listing, home: { lat: number; lon: number } | null) {
  if (!home || !listing.location) return null
  try {
    const point = await geocode(payload, listing.location, listing.country)
    return point ? { ...point, distanceKm: distanceKm(home, point) } : null
  } catch (err) {
    payload.logger.warn({ err, place: listing.location }, 'Geocoding failed')
    return null
  }
}

// The Marketplaces list: searched together; each site's outcome saved on its row and its health record.
async function searchOtherSites(payload: Payload, sites: Marketplace[], query: SearchQuery) {
  const perSite = await searchSites(sites, query)
  for (const { site, listings, error } of perSite) {
    await payload.update({
      collection: 'marketplaces',
      id: site.id,
      data: { lastRunAt: new Date().toISOString(), lastResult: error ? `ERROR ${error}`.slice(0, 500) : `${listings.length} found` },
    })
    await recordHealth(payload, `site:${site.slug}`, site.name, error ? { error } : { found: listings.length })
  }
  if (perSite.length && perSite.every((r) => r.error)) throw new Error(`All ${perSite.length} marketplaces failed; see Deals → Marketplaces`)
  return perSite.flatMap((r) => r.listings)
}

type PriceEntry = { price: number | null; priceEur: number | null; at: string }

// Creates the listing if it's new; otherwise refreshes price, history and "last seen".
// Reports a price drop on a starred (interesting) listing.
async function upsertListing(
  payload: Payload,
  listing: Listing,
  priceEur: number | null,
  reference: number | null,
  savedSearch: number,
  place: { lat: number; lon: number; distanceKm: number } | null,
): Promise<{ created?: ListingDoc; priceDrop?: { listing: ListingDoc; from: number | null } }> {
  const now = new Date().toISOString()
  const discount = discountPct(priceEur, reference)
  const warning = dealWarning({ discountPct: discount, sellerFeedbackScore: listing.sellerFeedbackScore, sellerFeedbackPct: listing.sellerFeedbackPct })
  const { docs } = await payload.find({
    collection: 'listings',
    where: { source: { equals: listing.source }, externalId: { equals: listing.externalId } },
    limit: 1,
    depth: 0,
  })
  const existing = docs[0]
  if (existing) {
    const priceChanged = existing.price !== listing.price
    const history = (existing.priceHistory as PriceEntry[] | null) ?? []
    const updated = await payload.update({
      collection: 'listings',
      id: existing.id,
      data: {
        lastSeenAt: now,
        availability: 'available',
        ...(priceChanged || (existing.referencePrice ?? null) !== reference
          ? {
              price: listing.price,
              priceEur,
              referencePrice: reference,
              discountPct: discount,
              warning,
              priceHistory: priceChanged ? [...history, { price: existing.price ?? null, priceEur: existing.priceEur ?? null, at: now }] : history,
            }
          : {}),
      },
    })
    const dropped = priceChanged && priceEur != null && existing.priceEur != null && priceEur < existing.priceEur
    return dropped && existing.state === 'interesting' ? { priceDrop: { listing: updated, from: existing.priceEur ?? null } } : {}
  }

  const { sellerFeedbackScore: _score, sellerFeedbackPct: _pct, ...fields } = listing
  const recent = await payload.find({
    collection: 'listings',
    where: {
      firstSeenAt: { greater_than: new Date(Date.now() - 30 * DAY).toISOString() },
      duplicateOf: { exists: false },
      source: { not_equals: listing.source },
    },
    select: { title: true, source: true, priceEur: true },
    limit: 500,
    depth: 0,
  })
  const duplicate = findDuplicate({ title: listing.title, source: listing.source, priceEur }, recent.docs)
  const created = await payload.create({
    collection: 'listings',
    data: {
      ...fields,
      priceEur,
      referencePrice: reference,
      discountPct: discount,
      warning,
      postedAt: listing.postedAt?.toISOString(),
      firstSeenAt: now,
      lastSeenAt: now,
      savedSearch,
      state: 'new',
      duplicateOf: duplicate?.id,
      ...(place && { lat: place.lat, lon: place.lon, distanceKm: place.distanceKm }),
    },
  })
  return { created }
}

const describe = (a: Alert) => {
  const l = a.listing
  const price = a.reason === 'drop' ? `price drop €${a.oldPriceEur} → €${l.priceEur}` : `€${l.priceEur}`
  const discount = l.discountPct != null ? ` (${l.discountPct}% below new ~€${l.referencePrice})` : ''
  const where = [l.marketplace ?? l.source, l.country, l.distanceKm != null ? `${l.distanceKm} km` : null].filter(Boolean).join(', ')
  return `${price}${discount} – ${l.title} (${where}) [${a.search.name}]${l.warning ? `\n  ⚠ ${l.warning}` : ''}`
}

// One email per run with every alert, plus one push message per alert.
async function sendAlerts(payload: Payload, to: string | null | undefined, alerts: Alert[]) {
  for (const a of alerts) {
    await sendPush({
      title: a.reason === 'drop' ? `Price drop: ${a.listing.title}` : `Deal: €${a.listing.priceEur} ${a.listing.title}`,
      message: describe(a),
      url: a.listing.url,
    })
  }
  if (!to) {
    if (!pushConfigured()) payload.logger.warn('Deal alerts matched but no admin email or push channel is configured')
  } else {
    try {
      await payload.sendEmail({
        to,
        subject: `Deals radar: ${alerts.length} alert${alerts.length > 1 ? 's' : ''}`,
        text: `${alerts.map((a) => `• ${describe(a)}\n  ${a.listing.url}`).join('\n\n')}\n\nDashboard: ${SITE}/admin/deals`,
      })
    } catch (err) {
      payload.logger.error({ err }, 'Failed to send deal alert email')
    }
  }
  const now = new Date().toISOString()
  for (const { listing } of alerts) {
    await payload.update({ collection: 'listings', id: listing.id, data: { alertedAt: now } })
  }
}

// Daily: open each starred listing; a 404/410 means it's sold or removed.
export async function checkStarredListings(payload: Payload) {
  const settings = await payload.findGlobal({ slug: 'settings' })
  const permitted = new Set((settings.permittedDealSources ?? []) as string[])
  const { docs } = await payload.find({
    collection: 'listings',
    where: { state: { equals: 'interesting' }, availability: { not_equals: 'gone' } },
    pagination: false,
    depth: 0,
  })
  let gone = 0
  for (const listing of docs) {
    try {
      await toolsFor(permitted.has(listing.source)).fetch(listing.url, { headers: { accept: 'text/html' } })
    } catch (err) {
      if (err instanceof HttpError && (err.status === 404 || err.status === 410)) {
        await payload.update({ collection: 'listings', id: listing.id, data: { availability: 'gone', goneAt: new Date().toISOString() } })
        gone++
      }
    }
  }
  return { checked: docs.length, gone }
}
