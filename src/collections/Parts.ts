import type { CollectionConfig } from 'payload'
import { admins, anyone, hiddenFromContributors } from '../access'

export const Parts: CollectionConfig = {
  slug: 'parts',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'brand', 'category'],
    group: 'Affiliate',
    hidden: hiddenFromContributors,
  },
  access: { read: anyone, create: admins, update: admins, delete: admins },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'brand', type: 'text' },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        'frame', 'motors', 'esc', 'flight-controller', 'stack', 'vtx', 'camera', 'receiver',
        'antenna', 'props', 'battery', 'goggles', 'radio', 'other',
      ].map((v) => ({ label: v.replace('-', ' '), value: v })),
    },
    { name: 'affiliateLinks', type: 'join', collection: 'affiliate-links', on: 'part' },
  ],
}
