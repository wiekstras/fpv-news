import type { CollectionConfig } from 'payload'
import { admins, adminsField, isAdminUser, hiddenFromContributors } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'createdAt'],
    hidden: hiddenFromContributors,
  },
  auth: {
    verify: true,
    maxLoginAttempts: 10,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    // Public registration goes through the /register server action, not the REST API.
    create: admins,
    read: ({ req }) => isAdminUser(req) || (req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => isAdminUser(req) || (req.user ? { id: { equals: req.user.id } } : false),
    delete: admins,
  },
  hooks: {
    beforeChange: [
      // The very first account (created via /admin) becomes the admin.
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) data.role = 'admin'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'contributor',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Contributor', value: 'contributor' },
      ],
      access: { create: adminsField, update: adminsField },
    },
    {
      name: 'lastDealsVisitAt',
      type: 'date',
      admin: { hidden: true },
      access: { read: adminsField, update: adminsField },
    },
  ],
}
