import type { Payload } from 'payload'
import type { Listing as ListingDoc, SavedSearch } from '@/payload-types'
import { fetchText } from '../http'
import { ADAPTERS } from './adapters'
import { parseEcbRates, toEur } from './fx'
import { politeFetch } from './http'
import { matchesSearch } from './match'
import type { DealSource } from './options'
import type { Listing } from './types'

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
const SITE = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export async function refreshFxRates(payload: Payload) {
  const { date, rates } = parseEcbRates(await fetchText(ECB_URL))
  for (const [currency, rate] of Object.entries(rates)) {
    const { docs } = await payload.find({ collection: 'fx-rates', where: { currency: { equals: currency } }, limit: 1 })
    if (docs[0]) await payload.update({ collection: 'fx-rates', id: docs[0].id, data: { rate, date } })
    else await payload.create({ collection: 'fx-rates', data: { currency, rate, date } })
  }
  return Object.keys(rates).length
}

async function loadRates(payload: Payload) {
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

// Runs active saved searches (or one) against every enabled source and stores new listings.
export async function runDealSearches(payload: Payload, searchId?: number) {
  const settings = await payload.findGlobal({ slug: 'settings' })
  const enabled = new Set((settings.enabledDealSources ?? []) as DealSource[])
  const rates = await loadRates(payload)
  const { docs: searches } = await payload.find({
    collection: 'saved-searches',
    where: searchId ? { id: { equals: searchId } } : { active: { equals: true } },
    pagination: false,
  })

  const results: RunResult[] = []
  const alerts: { listing: ListingDoc; search: SavedSearch }[] = []

  for (const search of searches) {
    const wanted = (search.sources?.length ? search.sources : [...enabled]) as DealSource[]
    for (const source of wanted.filter((s) => enabled.has(s))) {
      const adapter = ADAPTERS[source]
      if (!adapter) {
        results.push({ search: search.name, source, error: 'No adapter for this source yet' })
        continue
      }
      try {
        const found = await adapter.search(
          { keywords: search.keywords, minPrice: search.minPrice, maxPrice: search.maxPrice, countries: search.countries ?? [] },
          politeFetch,
        )
        let created = 0
        for (const listing of found) {
          const priceEur = toEur(listing.price, listing.currency, rates)
          if (!matchesSearch(listing, priceEur, search)) continue
          const doc = await upsertListing(payload, listing, priceEur, search.id)
          if (doc) {
            created++
            if (search.alertBelow != null && priceEur != null && priceEur <= search.alertBelow) alerts.push({ listing: doc, search })
          }
        }
        results.push({ search: search.name, source, found: found.length, new: created })
      } catch (err) {
        results.push({ search: search.name, source, error: err instanceof Error ? err.message : String(err) })
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

  if (alerts.length) await sendAlert(payload, settings.adminEmail, alerts)
  return results
}

// Creates the listing if it is new (returns it); otherwise refreshes the price and returns null.
async function upsertListing(payload: Payload, listing: Listing, priceEur: number | null, savedSearch: number) {
  const { docs } = await payload.find({
    collection: 'listings',
    where: { source: { equals: listing.source }, externalId: { equals: listing.externalId } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) {
    if (docs[0].price !== listing.price) {
      await payload.update({ collection: 'listings', id: docs[0].id, data: { price: listing.price, priceEur } })
    }
    return null
  }
  return payload.create({
    collection: 'listings',
    data: {
      ...listing,
      priceEur,
      postedAt: listing.postedAt?.toISOString(),
      firstSeenAt: new Date().toISOString(),
      savedSearch,
      state: 'new',
    },
  })
}

async function sendAlert(payload: Payload, to: string | null | undefined, alerts: { listing: ListingDoc; search: SavedSearch }[]) {
  if (!to) {
    payload.logger.warn('Deal alerts matched but Settings → Site → Admin email is empty')
    return
  }
  const lines = alerts.map(
    ({ listing, search }) =>
      `• €${listing.priceEur} – ${listing.title} (${listing.source}, ${listing.country}) [${search.name}]\n  ${listing.url}`,
  )
  try {
    await payload.sendEmail({
      to,
      subject: `Deals radar: ${alerts.length} new listing${alerts.length > 1 ? 's' : ''} under your price`,
      text: `${lines.join('\n\n')}\n\nDashboard: ${SITE}/admin/deals`,
    })
    const now = new Date().toISOString()
    for (const { listing } of alerts) {
      await payload.update({ collection: 'listings', id: listing.id, data: { alertedAt: now } })
    }
  } catch (err) {
    payload.logger.error({ err }, 'Failed to send deal alert email')
  }
}
