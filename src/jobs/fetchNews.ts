import type { TaskConfig } from 'payload'
import { fetchSources } from '@/lib/news/ingest'

export const fetchNews: TaskConfig<'fetchNews'> = {
  slug: 'fetchNews',
  schedule: [{ cron: '0 */15 * * * *', queue: 'news' }],
  handler: async ({ req }) => {
    const results = await fetchSources(req.payload)
    req.payload.logger.info({ results }, 'Fetched news sources')
    return { output: {} }
  },
}
