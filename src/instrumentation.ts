// Initialise Payload when the server starts: runs pending migrations, seeds an empty database
// and starts the job crons (news, digests, deals) even before the first request comes in.
export async function register() {
  // Skip during `next build`: the build environment may not have database access.
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') return
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
