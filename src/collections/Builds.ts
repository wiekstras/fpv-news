import { APIError, type Access, type CollectionConfig, type Where } from 'payload'
import { adminsField, isAdminUser, loggedIn } from '../access'
import { slugify } from '../lib/slugify'
import { BUILD_TAGS } from '../lib/tags'

const editableStatuses = ['draft', 'pending']

// Public: published builds. Contributors: published + their own. Admins: all.
const readBuilds: Access = ({ req }) => {
  if (isAdminUser(req)) return true
  const published: Where = { status: { equals: 'published' } }
  if (req.user) return { or: [published, { author: { equals: req.user.id } }] }
  return published
}

export const Builds: CollectionConfig = {
  slug: 'builds',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'updatedAt'],
    description: 'Write up your build, then set the status to "Pending review" to submit it.',
  },
  access: {
    read: readBuilds,
    create: loggedIn,
    update: ({ req }) => {
      if (isAdminUser(req)) return true
      if (!req.user) return false
      return { author: { equals: req.user.id }, status: { in: editableStatuses } }
    },
    delete: ({ req }) => {
      if (isAdminUser(req)) return true
      if (!req.user) return false
      return { author: { equals: req.user.id }, status: { equals: 'draft' } }
    },
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) data.slug = slugify(data.title)
        return data
      },
    ],
    beforeChange: [
      ({ data, operation, originalDoc, req }) => {
        if (!isAdminUser(req)) {
          if (operation === 'create') data.author = req.user?.id
          if (!editableStatuses.includes(data.status ?? 'draft')) {
            throw new APIError('Only admins can publish builds.', 403, null, true)
          }
        }
        if (data.status === 'published' && originalDoc?.status !== 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Generated from the title when empty.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending review', value: 'pending' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'moderationNote',
      type: 'textarea',
      access: { create: adminsField, update: adminsField },
      admin: { position: 'sidebar', description: 'Feedback from the moderator.' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      access: { update: adminsField },
      admin: { position: 'sidebar' },
    },
    { name: 'publishedAt', type: 'date', index: true, admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 280,
      admin: { description: 'One or two sentences shown on cards and in the newsletter.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'difficulty',
          type: 'select',
          required: true,
          options: [
            { label: 'Beginner', value: 'beginner' },
            { label: 'Intermediate', value: 'intermediate' },
            { label: 'Advanced', value: 'advanced' },
          ],
        },
        {
          name: 'frameSize',
          type: 'select',
          required: true,
          options: ['whoop', '2"', '2.5"', '3"', '3.5"', '4"', '5"', '6"', '7"', '8"+'].map((v) => ({
            label: v === 'whoop' ? 'Whoop (65–75mm)' : v,
            value: v,
          })),
        },
      ],
    },
    { name: 'tags', type: 'select', hasMany: true, options: BUILD_TAGS },
    { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'content', type: 'richText', required: true },
    {
      name: 'parts',
      type: 'array',
      labels: { singular: 'Part', plural: 'Parts list' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'part',
              type: 'relationship',
              relationTo: 'parts',
              admin: { description: 'Pick from the catalog…' },
            },
            {
              name: 'freeText',
              type: 'text',
              admin: { description: '…or type the part name if it is not listed.' },
              validate: (value: string | null | undefined, { siblingData }: { siblingData: any }) =>
                value || siblingData?.part ? true : 'Pick a catalog part or type a name.',
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'quantity', type: 'number', defaultValue: 1, min: 1 },
            { name: 'note', type: 'text' },
          ],
        },
      ],
    },
  ],
}
