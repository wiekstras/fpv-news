import type { CollectionConfig } from 'payload'
import { admins, anyone, hiddenFromContributors } from '../access'

export const Retailers: CollectionConfig = {
  slug: 'retailers',
  admin: {
    useAsTitle: 'name',
    group: 'Affiliate',
    hidden: hiddenFromContributors,
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'url', type: 'text' },
    { name: 'country', type: 'text', admin: { description: 'ISO code, e.g. NL, DE, or EU / Global.' } },
  ],
}
