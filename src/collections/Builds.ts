import {
  APIError,
  type Access,
  type CollectionAfterChangeHook,
  type CollectionConfig,
  type Where,
} from 'payload'
import type { Build } from '@/payload-types'
import { adminsField, isAdminUser, loggedIn } from '../access'
import { DIFFICULTIES, FRAME_SIZES } from '../lib/builds/options'
import { slugify } from '../lib/slugify'
import { BUILD_TAGS } from '../lib/tags'

const editableStatuses = ['draft', 'pending']
const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

// Emails for the moderation flow. Failures are logged, never block the save.
const notifyOnStatusChange: CollectionAfterChangeHook<Build> = async ({ context, doc, previousDoc, req }) => {
  if (context.skipNotifications || doc.status === previousDoc?.status) return doc
  const authorId = typeof doc.author === 'object' ? doc.author?.id : doc.author
  const author = authorId
    ? await req.payload.findByID({ collection: 'users', id: authorId, depth: 0, overrideAccess: true, req })
    : null
  let message: { to: string; subject: string; text: string } | null = null

  if (doc.status === 'pending') {
    const { adminEmail } = await req.payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
    if (adminEmail) {
      message = {
        to: adminEmail,
        subject: `Build to review: ${doc.title}`,
        text: `${author?.name ?? 'Someone'} submitted "${doc.title}".\n\nReview it: ${siteUrl}/admin/collections/builds/${doc.id}`,
      }
    }
  } else if (doc.status === 'published' && author) {
    message = {
      to: author.email,
      subject: `Your build is live: ${doc.title}`,
      text: `Thanks for sharing! "${doc.title}" is now published:\n${siteUrl}/builds/${doc.slug}`,
    }
  } else if (doc.status === 'draft' && previousDoc?.status === 'pending' && author && isAdminUser(req)) {
    message = {
      to: author.email,
      subject: `Changes requested: ${doc.title}`,
      text: `Your build "${doc.title}" was sent back to draft.\n\n${doc.moderationNote ?? ''}\n\nEdit it: ${siteUrl}/admin/collections/builds/${doc.id}`,
    }
  }

  if (message) {
    try {
      await req.payload.sendEmail(message)
    } catch (err) {
      req.payload.logger.error({ err }, 'Failed to send build moderation email')
    }
  }
  return doc
}

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
    // Contributors only see their own builds in the admin list.
    baseFilter: ({ req }) => (isAdminUser(req) || !req.user ? null : { author: { equals: req.user.id } }),
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
      async ({ data, operation, originalDoc, req }) => {
        // Logged-in non-admins (contributors). Server code without a user (seeds, jobs) is trusted.
        if (req.user && !isAdminUser(req)) {
          if (operation === 'create') data.author = req.user.id
          if (!editableStatuses.includes(data.status ?? 'draft')) {
            throw new APIError('Only admins can publish builds.', 403, null, true)
          }
        }
        if (data.status === 'published' && originalDoc?.status !== 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        // Store the author's display name so public pages don't need access to user records.
        // Always recomputed, so a submitted authorName is ignored.
        const authorId = typeof data.author === 'object' ? data.author?.id : (data.author ?? originalDoc?.author)
        data.authorName = null
        if (authorId) {
          const author = await req.payload.findByID({ collection: 'users', id: authorId, depth: 0, overrideAccess: true, req })
          data.authorName = author.name
        }
        return data
      },
    ],
    afterChange: [notifyOnStatusChange],
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
    { name: 'authorName', type: 'text', admin: { position: 'sidebar', readOnly: true } },
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
          options: DIFFICULTIES,
        },
        {
          name: 'frameSize',
          type: 'select',
          required: true,
          options: FRAME_SIZES,
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
