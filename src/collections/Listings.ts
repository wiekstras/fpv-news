import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors, isAdminUser } from '../access'
import { ebayNewPrices } from '../lib/deals/adapters/ebay'
import { politeFetch } from '../lib/deals/http'
import { type DealSource, DEAL_SOURCES } from '../lib/deals/options'
import { dealWarning } from '../lib/deals/quality'
import { marketPrice } from '../lib/deals/reference'
import { distanceKm, geocode } from '../lib/geo'
import { loadRates } from '../lib/deals/run'
import { searchAll } from '../lib/deals/search'

export const Listings: CollectionConfig = {
  slug: 'listings',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'source', 'priceEur', 'discountPct', 'country', 'firstSeenAt', 'state'],
    group: 'Deals',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  endpoints: [
    {
      // One-off search across all enabled platforms (dashboard "Search all platforms"). Not stored.
      path: '/search',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const body = (req.json ? await req.json() : {}) as {
          keywords?: string
          minPrice?: number
          maxPrice?: number
          countries?: string[]
          sources?: DealSource[]
          excludeKeywords?: string
          referencePrice?: number
          maxDistanceKm?: number
        }
        const keywords = body.keywords?.trim()
        if (!keywords) return Response.json({ error: 'Enter keywords' }, { status: 400 })

        const settings = await req.payload.findGlobal({ slug: 'settings' })
        const enabled = (settings.enabledDealSources ?? []) as DealSource[]
        const sources = body.sources?.length ? enabled.filter((s) => body.sources!.includes(s)) : enabled
        let reference = body.referencePrice || null
        if (!reference && process.env.EBAY_CLIENT_ID) {
          reference = await ebayNewPrices(keywords, politeFetch).then(marketPrice).catch(() => null)
        }
        const { docs: sites } = sources.includes('other')
          ? await req.payload.find({ collection: 'marketplaces', where: { enabled: { equals: true } }, pagination: false, depth: 0 })
          : { docs: [] }
        const result = await searchAll({
          query: {
            keywords,
            minPrice: body.minPrice,
            maxPrice: body.maxPrice,
            countries: body.countries ?? [],
            excludeKeywords: body.excludeKeywords,
          },
          sources,
          permitted: new Set((settings.permittedDealSources ?? []) as DealSource[]),
          sites,
          rates: await loadRates(req.payload),
          reference,
        })
        // Warnings, and distances when a max distance is asked for (geocoding is cached but limited to 1/s).
        const home = settings.homeLat != null && settings.homeLon != null ? { lat: settings.homeLat, lon: settings.homeLon } : null
        const listings = []
        for (const l of result.listings) {
          const warning = dealWarning({ discountPct: l.discountPct, sellerFeedbackScore: l.sellerFeedbackScore, sellerFeedbackPct: l.sellerFeedbackPct })
          let km: number | null = null
          if (body.maxDistanceKm && home && l.location) {
            const point = await geocode(req.payload, l.location, l.country).catch(() => null)
            km = point ? distanceKm(home, point) : null
            if (km != null && km > body.maxDistanceKm) continue
          }
          listings.push({ ...l, warning, distanceKm: km })
        }
        return Response.json({ ...result, listings, reference })
      },
    },
    {
      // Queues a deals run; the job queue picks it up within a minute.
      path: '/run-now',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const { totalDocs } = await req.payload.count({
          collection: 'payload-jobs',
          where: {
            taskSlug: { equals: 'runDeals' },
            completedAt: { exists: false },
            hasError: { not_equals: true },
            or: [{ waitUntil: { exists: false } }, { waitUntil: { less_than_equal: new Date().toISOString() } }],
          },
        })
        if (totalDocs === 0) await req.payload.jobs.queue({ task: 'runDeals', queue: 'deals', input: { force: true } })
        return Response.json({ queued: true })
      },
    },
  ],
  defaultSort: '-firstSeenAt',
  indexes: [{ fields: ['source', 'externalId'], unique: true }],
  fields: [
    { name: 'source', type: 'select', required: true, options: DEAL_SOURCES, index: true },
    { name: 'externalId', type: 'text', required: true },
    { name: 'marketplace', type: 'text', admin: { description: 'Site name for "Other marketplaces"' } },
    { name: 'title', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'price', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'EUR' },
        { name: 'priceEur', type: 'number', index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'referencePrice', type: 'number', admin: { description: 'New price (EUR) when this was seen' } },
        { name: 'discountPct', type: 'number', index: true, admin: { description: '% below the new price' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'location', type: 'text' },
        { name: 'country', type: 'text', index: true },
      ],
    },
    { name: 'url', type: 'text', required: true },
    { name: 'image', type: 'text' },
    { name: 'postedAt', type: 'date' },
    { name: 'firstSeenAt', type: 'date', required: true, index: true },
    { name: 'savedSearch', type: 'relationship', relationTo: 'saved-searches', index: true },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Interesting', value: 'interesting' },
        { label: 'Ignored', value: 'ignored' },
      ],
    },
    { name: 'alertedAt', type: 'date', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'lastSeenAt', type: 'date', admin: { readOnly: true } },
        {
          name: 'availability',
          type: 'select',
          defaultValue: 'available',
          index: true,
          options: [
            { label: 'Available', value: 'available' },
            { label: 'Gone (sold or removed)', value: 'gone' },
          ],
        },
        { name: 'goneAt', type: 'date', admin: { readOnly: true } },
      ],
    },
    {
      name: 'priceHistory',
      type: 'json',
      admin: { readOnly: true, description: 'Earlier prices: [{ price, priceEur, at }]' },
    },
    {
      name: 'duplicateOf',
      type: 'relationship',
      relationTo: 'listings',
      index: true,
      admin: { description: 'Same item posted on another site; shown under that listing.' },
    },
    { name: 'warning', type: 'text', admin: { description: 'Why this deal may be too good to be true' } },
    { name: 'sellerRating', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'lat', type: 'number', admin: { readOnly: true } },
        { name: 'lon', type: 'number', admin: { readOnly: true } },
        { name: 'distanceKm', type: 'number', index: true, admin: { readOnly: true } },
      ],
    },
  ],
}
