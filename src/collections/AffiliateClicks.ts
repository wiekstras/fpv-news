import type { CollectionConfig } from 'payload'
import { adminsOnly, hiddenFromContributors } from '../access'

// One row per click on a shop link (/go/<link id>), for per-link and per-build stats.
export const AffiliateClicks: CollectionConfig = {
  slug: 'affiliate-clicks',
  admin: {
    defaultColumns: ['affiliateLink', 'build', 'createdAt'],
    group: 'Affiliate',
    hidden: hiddenFromContributors,
  },
  access: adminsOnly,
  fields: [
    { name: 'affiliateLink', type: 'relationship', relationTo: 'affiliate-links', required: true, index: true },
    { name: 'build', type: 'relationship', relationTo: 'builds', index: true },
  ],
}
