import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'

export const EmailEvents: CollectionConfig = {
  slug: 'email-events',
  admin: {
    defaultColumns: ['type', 'digest', 'subscriber', 'createdAt'],
    group: 'Newsletter',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  fields: [
    { name: 'digest', type: 'relationship', relationTo: 'digests', required: true, index: true },
    { name: 'subscriber', type: 'relationship', relationTo: 'subscribers', index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'].map((v) => ({
        label: v,
        value: v,
      })),
    },
    { name: 'url', type: 'text' },
    { name: 'resendId', type: 'text', index: true },
  ],
}
