import type { Payload } from 'payload'
import type { SourceHealth } from '@/payload-types'
import { sendPush } from '../notify'
import { SITE_URL } from '../site'

export const FAILURE_THRESHOLD = 5

type Outcome = { found: number } | { error: string }
type State = Pick<SourceHealth, 'consecutiveFailures' | 'paused'>

// Next health state after one run; `tripped` is true only on the run that pauses the source.
export function nextHealth(prev: State | undefined, outcome: Outcome, now = new Date()) {
  const at = now.toISOString()
  if ('found' in outcome) {
    return { data: { lastSuccessAt: at, lastFound: outcome.found, consecutiveFailures: 0 }, tripped: false }
  }
  const failures = (prev?.consecutiveFailures ?? 0) + 1
  const tripped = !prev?.paused && failures >= FAILURE_THRESHOLD
  return {
    data: { lastFailureAt: at, lastError: outcome.error.slice(0, 500), consecutiveFailures: failures, ...(tripped ? { paused: true } : {}) },
    tripped,
  }
}

export async function recordHealth(payload: Payload, key: string, label: string, outcome: Outcome) {
  const { docs } = await payload.find({ collection: 'source-health', where: { key: { equals: key } }, limit: 1, depth: 0 })
  const { data, tripped } = nextHealth(docs[0], outcome)
  if (docs[0]) await payload.update({ collection: 'source-health', id: docs[0].id, data: { ...data, label } })
  else await payload.create({ collection: 'source-health', data: { key, label, ...data } })

  if (tripped) {
    const message = `${label} failed ${FAILURE_THRESHOLD} runs in a row and is paused. Last error: ${'error' in outcome ? outcome.error : ''}`
    const url = `${SITE_URL}/admin/deals`
    const { adminEmail } = await payload.findGlobal({ slug: 'settings' })
    if (adminEmail) {
      await payload
        .sendEmail({ to: adminEmail, subject: `Deals radar: ${label} paused`, text: `${message}\n\nResume it on the dashboard: ${url}` })
        .catch((err: unknown) => payload.logger.error({ err }, 'Failed to send source health email'))
    }
    await sendPush({ title: `Deals radar: ${label} paused`, message, url })
  }
}

export async function pausedKeys(payload: Payload): Promise<Set<string>> {
  const { docs } = await payload.find({
    collection: 'source-health',
    where: { paused: { equals: true } },
    pagination: false,
    depth: 0,
    select: { key: true },
  })
  return new Set(docs.map((d) => d.key))
}
