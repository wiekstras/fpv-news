import type { TaskConfig } from 'payload'
import { checkStarredListings, refreshFxRates, runDealSearches } from '@/lib/deals/run'
import { reported } from '@/lib/monitoring'

export const runDeals: TaskConfig<{ input: { force?: boolean }; output: object }> = {
  slug: 'runDeals',
  // Hourly; each saved search runs when it's due (its "run every N hours"). "Run now" sets force.
  schedule: [{ cron: '0 7 * * * *', queue: 'deals' }],
  inputSchema: [{ name: 'force', type: 'checkbox' }],
  handler: reported('runDeals', async ({ input, req }) => {
    const results = await runDealSearches(req.payload, { force: Boolean(input?.force) })
    req.payload.logger.info({ results }, 'Deals radar run finished')
    return { output: {} }
  }),
}

export const fetchFxRates: TaskConfig<'fetchFxRates'> = {
  slug: 'fetchFxRates',
  // The ECB publishes around 16:00 CET.
  schedule: [{ cron: '0 30 15 * * *', queue: 'deals' }],
  handler: reported('fetchFxRates', async ({ req }) => {
    await refreshFxRates(req.payload)
    return { output: {} }
  }),
}

export const checkListings: TaskConfig<'checkListings'> = {
  slug: 'checkListings',
  // Daily: are starred listings still online?
  schedule: [{ cron: '0 40 4 * * *', queue: 'deals' }],
  handler: reported('checkListings', async ({ req }) => {
    const result = await checkStarredListings(req.payload)
    req.payload.logger.info(result, 'Checked starred listings')
    return { output: {} }
  }),
}
