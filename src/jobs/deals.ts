import type { TaskConfig } from 'payload'
import { refreshFxRates, runDealSearches } from '@/lib/deals/run'

export const runDeals: TaskConfig<'runDeals'> = {
  slug: 'runDeals',
  // Every 3 hours; each source is also rate-limited per request in politeFetch.
  schedule: [{ cron: '0 7 */3 * * *', queue: 'deals' }],
  handler: async ({ req }) => {
    const results = await runDealSearches(req.payload)
    req.payload.logger.info({ results }, 'Deals radar run finished')
    return { output: {} }
  },
}

export const fetchFxRates: TaskConfig<'fetchFxRates'> = {
  slug: 'fetchFxRates',
  // The ECB publishes around 16:00 CET.
  schedule: [{ cron: '0 30 15 * * *', queue: 'deals' }],
  handler: async ({ req }) => {
    await refreshFxRates(req.payload)
    return { output: {} }
  },
}
