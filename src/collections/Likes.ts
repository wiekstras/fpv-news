import type { CollectionConfig } from 'payload'
import { adminsOnly } from '../access'

// One like per user per build.
export const Likes: CollectionConfig = {
  slug: 'likes',
  admin: { hidden: true },
  access: adminsOnly,
  indexes: [{ fields: ['build', 'user'], unique: true }],
  fields: [
    { name: 'build', type: 'relationship', relationTo: 'builds', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
  ],
}
