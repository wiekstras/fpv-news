import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'consentAt', 'confirmedAt'],
    group: 'Newsletter',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending confirmation', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
    },
    // Random secret used in confirm and unsubscribe links.
    { name: 'token', type: 'text', required: true, unique: true, index: true, admin: { hidden: true } },
    {
      type: 'collapsible',
      label: 'Consent record (GDPR)',
      fields: [
        { name: 'consentAt', type: 'date', required: true, admin: { readOnly: true } },
        { name: 'consentText', type: 'textarea', required: true, admin: { readOnly: true } },
        { name: 'confirmedAt', type: 'date', admin: { readOnly: true } },
        { name: 'unsubscribedAt', type: 'date', admin: { readOnly: true } },
      ],
    },
  ],
}
