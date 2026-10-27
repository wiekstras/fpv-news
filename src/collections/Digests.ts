import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'

export const Digests: CollectionConfig = {
  slug: 'digests',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'weekOf', 'status'],
    group: 'Newsletter',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  fields: [
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
