import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'
import { DEAL_SOURCES } from '../lib/deals'

export const Listings: CollectionConfig = {
  slug: 'listings',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'source', 'priceEur', 'country', 'firstSeenAt', 'state'],
    group: 'Deals',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  defaultSort: '-firstSeenAt',
  indexes: [{ fields: ['source', 'externalId'], unique: true }],
  fields: [
    { name: 'source', type: 'select', required: true, options: DEAL_SOURCES, index: true },
    { name: 'externalId', type: 'text', required: true },
    { name: 'title', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'price', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'EUR' },
        { name: 'priceEur', type: 'number', index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'location', type: 'text' },
        { name: 'country', type: 'text', index: true },
      ],
    },
    { name: 'url', type: 'text', required: true },
    { name: 'image', type: 'text' },
    { name: 'postedAt', type: 'date' },
    { name: 'firstSeenAt', type: 'date', required: true, index: true },
    { name: 'savedSearch', type: 'relationship', relationTo: 'saved-searches', index: true },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Interesting', value: 'interesting' },
        { label: 'Ignored', value: 'ignored' },
      ],
    },
    { name: 'alertedAt', type: 'date', admin: { readOnly: true } },
  ],
}
