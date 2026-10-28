import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'
import { COUNTRIES } from '../lib/deals/options'

// Extra marketplaces searched with the generic adapter (source "other"): add, fix or switch off
// sites here without code changes. Each run records what it found or why it failed.
export const Marketplaces: CollectionConfig = {
  slug: 'marketplaces',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'mode', 'enabled', 'permitted', 'lastResult'],
    group: 'Deals',
    hidden: hiddenFromContributors,
    description:
      'Searched when "Other marketplaces" is enabled in Settings → Deals. Results are read from the schema.org data on the search page; sites without it need a dedicated adapter.',
  },
  access: adminsOnly,
  defaultSort: 'country',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'country', type: 'select', required: true, options: COUNTRIES },
        { name: 'currency', type: 'text', required: true, defaultValue: 'EUR' },
      ],
    },
    {
      name: 'searchUrl',
      type: 'text',
      required: true,
      admin: { description: 'Search results URL with {q} for the keywords, optional {min} / {max} for the price (local currency).' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'mode',
          type: 'select',
          required: true,
          defaultValue: 'http',
          options: [
            { label: 'Plain HTTP (fast)', value: 'http' },
            { label: 'Headless browser (JavaScript sites)', value: 'browser' },
          ],
        },
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        {
          name: 'permitted',
          type: 'checkbox',
          defaultValue: false,
          label: 'Site gave permission (skip robots.txt)',
        },
      ],
    },
    { name: 'notes', type: 'textarea' },
    {
      type: 'row',
      fields: [
        { name: 'lastRunAt', type: 'date', admin: { readOnly: true } },
        { name: 'lastResult', type: 'text', admin: { readOnly: true } },
      ],
    },
  ],
}
