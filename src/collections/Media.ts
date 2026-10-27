import type { CollectionConfig } from 'payload'
import { adminsOrOwner, anyone, isAdminUser, loggedIn } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    // Contributors only see (and can pick) their own uploads in the admin.
    baseFilter: ({ req }) => (isAdminUser(req) || !req.user ? null : { uploadedBy: { equals: req.user.id } }),
  },
  access: {
    read: anyone,
    create: loggedIn,
    update: adminsOrOwner('uploadedBy'),
    delete: adminsOrOwner('uploadedBy'),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user) data.uploadedBy = req.user.id
        return data
      },
    ],
  },
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumb', width: 480, height: 320, position: 'centre' },
      { name: 'large', width: 1600 },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
