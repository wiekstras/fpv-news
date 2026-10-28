import type { CollectionConfig } from 'payload'
import { hiddenFromContributors, isAdminUser } from '../access'

// Comments on builds. Written through the build page (logged-in users); admins can hide them.
export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'body',
    defaultColumns: ['body', 'authorName', 'build', 'status', 'createdAt'],
    group: 'Community',
    hidden: hiddenFromContributors,
  },
  access: {
    read: ({ req }) => isAdminUser(req) || { status: { equals: 'visible' } },
    create: ({ req }) => isAdminUser(req),
    update: ({ req }) => isAdminUser(req),
    delete: ({ req }) => isAdminUser(req) || (req.user ? { author: { equals: req.user.id } } : false),
  },
  fields: [
    { name: 'build', type: 'relationship', relationTo: 'builds', required: true, index: true },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'authorName', type: 'text', required: true },
    { name: 'body', type: 'textarea', required: true, maxLength: 2000 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'visible',
      options: [
        { label: 'Visible', value: 'visible' },
        { label: 'Hidden', value: 'hidden' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
