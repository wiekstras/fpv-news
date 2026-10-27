// Initialise Payload when the server starts so the job crons (news fetching,
// digests, deal searches) run even before the first request comes in.
export async function register() {
  // Skip during `next build`: the build environment may not have database access.
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') return
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  await getPayload({ config, cron: true })
}
