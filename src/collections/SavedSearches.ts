import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'
import { COUNTRIES, DEAL_SOURCES } from '../lib/deals'

export const SavedSearches: CollectionConfig = {
  slug: 'saved-searches',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'keywords', 'maxPrice', 'active', 'lastRunAt'],
    group: 'Deals',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'keywords',
      type: 'text',
      required: true,
      admin: { description: 'Search query sent to each marketplace, e.g. "DJI O3" or "radiomaster".' },
    },
    {
      type: 'row',
      fields: [
        { name: 'minPrice', type: 'number', min: 0, admin: { description: 'EUR' } },
        { name: 'maxPrice', type: 'number', min: 0, admin: { description: 'EUR' } },
        {
          name: 'alertBelow',
          type: 'number',
          min: 0,
          admin: { description: 'Email me when a new match is under this price (EUR). Empty = no alert.' },
        },
      ],
    },
    { name: 'countries', type: 'select', hasMany: true, options: COUNTRIES },
    { name: 'sources', type: 'select', hasMany: true, options: DEAL_SOURCES },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'lastRunAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
  ],
}
