import type { Instrumentation } from 'next'

// Initialise Payload when the server starts: runs pending migrations, seeds an empty database
// and starts the job crons (news, digests, deals) even before the first request comes in.
export async function register() {
  // Skip during `next build`: the build environment may not have database access.
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') return
  if (process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV,
      tracesSampleRate: 0,
    })
  }
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const { seedStarterData } = await import('./seed/starterData')

  // The database may still be starting (e.g. right after a Railway deploy): retry for ~1 minute,
  // then exit so the platform restarts the service instead of serving errors forever.
  for (let attempt = 1; ; attempt++) {
    try {
      const payload = await getPayload({ config, cron: true })
      // Not in Payload's onInit: that is skipped when getPayload is retried after a failed start.
      await seedStarterData(payload).catch((err) => payload.logger.error({ err }, 'Seeding starter data failed'))
      return
    } catch (err) {
      if (attempt >= 12) {
        console.error('Could not start Payload (is DATABASE_URL correct and the database up?)', err)
        process.exit(1)
      }
      console.warn(`Payload start failed (attempt ${attempt}/12), retrying in 5s:`, err instanceof Error ? err.message : err)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

// Server errors (pages, API routes, server actions) go to Sentry when SENTRY_DSN is set.
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== 'nodejs') return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(...args)
}
