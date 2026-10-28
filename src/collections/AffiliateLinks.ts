import type { CollectionConfig } from 'payload'
import { admins, anyone, hiddenFromContributors } from '../access'

export const AffiliateLinks: CollectionConfig = {
  slug: 'affiliate-links',
  admin: {
    defaultColumns: ['part', 'retailer', 'price', 'clicks', 'active'],
    group: 'Affiliate',
    hidden: hiddenFromContributors,
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  fields: [
    { name: 'part', type: 'relationship', relationTo: 'parts', required: true, index: true },
    { name: 'retailer', type: 'relationship', relationTo: 'retailers', required: true },
    { name: 'url', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'price', type: 'number', min: 0, admin: { description: 'Current price at this shop (EUR), for build totals. Optional.' } },
        { name: 'clicks', type: 'number', defaultValue: 0, admin: { readOnly: true } },
      ],
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
