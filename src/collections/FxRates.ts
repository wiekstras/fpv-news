import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'

// ECB euro reference rates, refreshed daily by the fetchFxRates job.
export const FxRates: CollectionConfig = {
  slug: 'fx-rates',
  admin: { useAsTitle: 'currency', defaultColumns: ['currency', 'rate', 'date'], group: 'Deals', hidden: hiddenFromContributors },
  access: adminsOnly,
  fields: [
    { name: 'currency', type: 'text', required: true, unique: true },
    { name: 'rate', type: 'number', required: true, admin: { description: 'Units of this currency per 1 EUR' } },
    { name: 'date', type: 'text', required: true },
  ],
}
