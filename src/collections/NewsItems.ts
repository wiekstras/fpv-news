import type { CollectionConfig } from 'payload'
import { admins, isAdminUser, hiddenFromContributors } from '../access'
import { NEWS_TAGS } from '../lib/tags'

export const NewsItems: CollectionConfig = {
  slug: 'news-items',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'source', 'publishedAt', 'tags', 'hidden'],
    group: 'News',
    hidden: hiddenFromContributors,
  },
  defaultSort: '-publishedAt',
  access: {
    read: ({ req }) => isAdminUser(req) || { hidden: { not_equals: true } },
    create: admins,
    update: admins,
    delete: admins,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'source', type: 'relationship', relationTo: 'sources', required: true, index: true },
    { name: 'url', type: 'text', required: true },
    { name: 'canonicalUrl', type: 'text', required: true, unique: true, index: true },
    { name: 'normalizedTitle', type: 'text', index: true, admin: { hidden: true } },
    { name: 'publishedAt', type: 'date', required: true, index: true },
    {
      name: 'summary',
      type: 'textarea',
      admin: { description: 'Our own short summary. Never paste the original article.' },
    },
    { name: 'thumbnailUrl', type: 'text' },
    { name: 'tags', type: 'select', hasMany: true, options: NEWS_TAGS },
    {
      name: 'hidden',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Hide from the public site.' },
    },
  ],
}
