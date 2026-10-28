import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors, isAdminUser } from '../access'

// One row per deals source (built-in adapter or Marketplaces site), updated after every run.
// After several failures in a row the source is paused and you're notified once.
export const SourceHealth: CollectionConfig = {
  slug: 'source-health',
  labels: { singular: 'Source health', plural: 'Source health' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'lastSuccessAt', 'lastFound', 'consecutiveFailures', 'paused'],
    group: 'Deals',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  endpoints: [
    {
      path: '/:id/resume',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
        await req.payload.update({
          collection: 'source-health',
          id: Number(req.routeParams?.id),
          data: { paused: false, consecutiveFailures: 0 },
        })
        return Response.json({ ok: true })
      },
    },
  ],
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    { name: 'label', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'lastSuccessAt', type: 'date', admin: { readOnly: true } },
        { name: 'lastFound', type: 'number', admin: { readOnly: true } },
        { name: 'lastFailureAt', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'lastError', type: 'text', admin: { readOnly: true } },
    { name: 'consecutiveFailures', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'paused', type: 'checkbox', defaultValue: false, admin: { description: 'Skipped by runs. Untick to resume.' } },
  ],
}
