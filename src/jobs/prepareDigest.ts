import type { TaskConfig } from 'payload'
import { reported } from '@/lib/monitoring'
import { createDigestDraft, SITE } from '@/lib/newsletter/digest'
import { lastScheduledAt } from '@/lib/newsletter/schedule'

// Every 15 minutes: once this week's scheduled moment (Settings → Newsletter, Amsterdam time)
// has passed and no draft exists for it yet, build the draft and tell the admin. Never sends.
export const prepareDigest: TaskConfig<'prepareDigest'> = {
  slug: 'prepareDigest',
  schedule: [{ cron: '0 */15 * * * *', queue: 'newsletter' }],
  handler: reported('prepareDigest', async ({ req }) => {
    const { payload } = req
    const settings = await payload.findGlobal({ slug: 'settings' })
    const scheduledAt = lastScheduledAt(new Date(), Number(settings.digestDay), settings.digestTime)
    // Only build for a moment in the last 24h, so changing the schedule doesn't backfill old weeks.
    if (Date.now() - scheduledAt.getTime() > 24 * 60 * 60 * 1000) return { output: {} }

    const { totalDocs } = await payload.count({
      collection: 'digests',
      where: { weekOf: { equals: scheduledAt.toISOString() } },
    })
    if (totalDocs > 0) return { output: {} }

    const digest = await createDigestDraft(payload, scheduledAt)
    if (settings.adminEmail) {
      await payload.sendEmail({
        to: settings.adminEmail,
        subject: `Digest draft ready: ${digest.subject}`,
        text: `This week's digest draft is ready to review and send:\n${SITE}/admin/collections/digests/${digest.id}`,
      })
    }
    return { output: {} }
  }),
}
