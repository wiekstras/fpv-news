import type { CollectionConfig } from 'payload'
import { admins, anyone, hiddenFromContributors, isAdminUser } from '../access'
import { fetchSources } from '../lib/news/ingest'
import { NEWS_TAGS } from '../lib/tags'

export const Sources: CollectionConfig = {
  slug: 'sources',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'active', 'lastFetchedAt', 'lastError'],
    group: 'News',
    hidden: hiddenFromContributors,
    components: { beforeListTable: ['/admin/FetchNowButton#FetchNowButton'] },
  },
  endpoints: [
    {
      path: '/fetch-now',
      method: 'post',
      handler: async (req) => {
        if (!isAdminUser(req)) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const id = req.searchParams.get('id')
        return Response.json({ results: await fetchSources(req.payload, id ? Number(id) : undefined) })
      },
    },
  ],
  access: { read: anyone, create: admins, update: admins, delete: admins },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'rss',
      options: [
        { label: 'RSS / Atom feed', value: 'rss' },
        { label: 'YouTube channel', value: 'youtube' },
        { label: 'GitHub releases', value: 'github' },
        { label: 'Manufacturer blog', value: 'blog' },
      ],
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        description:
          'Feed URL. YouTube: https://www.youtube.com/feeds/videos.xml?channel_id=… — GitHub: https://github.com/<owner>/<repo>/releases.atom',
      },
    },
    { name: 'siteUrl', type: 'text', admin: { description: 'Homepage shown on the source page.' } },
    { name: 'defaultTags', type: 'select', hasMany: true, options: NEWS_TAGS },
    { name: 'active', type: 'checkbox', defaultValue: true },
    {
      type: 'row',
      fields: [
        { name: 'lastFetchedAt', type: 'date', admin: { readOnly: true } },
        { name: 'lastError', type: 'text', admin: { readOnly: true } },
      ],
    },
  ],
}
