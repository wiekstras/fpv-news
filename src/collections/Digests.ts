import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors, isAdminUser } from '../access'
import { createDigestDraft, digestContent } from '../lib/newsletter/digest'
import { writeDigestIntro } from '../lib/newsletter/intro'
import { sendDigest } from '../lib/newsletter/send'

export const Digests: CollectionConfig = {
  slug: 'digests',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'weekOf', 'status'],
    group: 'Newsletter',
    hidden: hiddenFromContributors,
    components: { beforeListTable: ['/admin/DigestActions#GenerateDigestButton'] },
  },
  access: adminsOnly,
  endpoints: [
    {
      path: '/generate',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const digest = await createDigestDraft(req.payload, new Date())
        return Response.json({ id: digest.id })
      },
    },
    {
      // (Re)write the intro with Claude from the digest's current items.
      path: '/:id/intro',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const digest = await req.payload.findByID({ collection: 'digests', id: Number(req.routeParams?.id), depth: 0 })
        try {
          const intro = await writeDigestIntro(await digestContent(req.payload, digest))
          if (!intro) return Response.json({ error: 'Claude is not configured (ANTHROPIC_API_KEY) or returned nothing' }, { status: 400 })
          await req.payload.update({ collection: 'digests', id: digest.id, data: { intro } })
          return Response.json({ intro })
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
        }
      },
    },
    {
      path: '/:id/send',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const { test } = req.json ? await req.json() : { test: false }
        try {
          const result = await sendDigest(req.payload, Number(req.routeParams?.id), { testTo: test ? req.user!.email : undefined })
          return Response.json(result)
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 })
        }
      },
    },
  ],
  fields: [
    {
      name: 'actions',
      type: 'ui',
      admin: { components: { Field: '/admin/DigestActions#DigestActions' } },
    },
    { name: 'subject', type: 'text', required: true },
    { name: 'weekOf', type: 'date', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sending', value: 'sending' },
        { label: 'Sent', value: 'sent' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'intro', type: 'textarea' },
    { name: 'featuredBuild', type: 'relationship', relationTo: 'builds' },
    {
      name: 'items',
      type: 'array',
      admin: { description: 'Drag to reorder. Leave the blurb empty to use the item summary.' },
      fields: [
        {
          name: 'kind',
          type: 'select',
          required: true,
          defaultValue: 'news',
          options: [
            { label: 'News', value: 'news' },
            { label: 'Build', value: 'build' },
          ],
        },
        {
          name: 'newsItem',
          type: 'relationship',
          relationTo: 'news-items',
          admin: { condition: (_, s) => s?.kind === 'news' },
        },
        {
          name: 'build',
          type: 'relationship',
          relationTo: 'builds',
          admin: { condition: (_, s) => s?.kind === 'build' },
        },
        { name: 'blurb', type: 'textarea' },
      ],
    },
    {
      name: 'stats',
      type: 'group',
      admin: { position: 'sidebar' },
      fields: [
        { name: 'sentAt', type: 'date', admin: { readOnly: true } },
        { name: 'recipients', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'opened', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'clicked', type: 'number', defaultValue: 0, admin: { readOnly: true } },
      ],
    },
  ],
}
