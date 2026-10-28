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
          'Feed URL. YouTube: https://www.youtube.com/feeds/videos.xml?channel_id=… — GitHub: https://github.com/<owner>/<repo>/releases.atom — Google News search: https://news.google.com/rss/search?q=<words>&hl=en',
      },
    },
    { name: 'siteUrl', type: 'text', admin: { description: 'Homepage shown on the source page.' } },
    {
      name: 'requireKeywords',
      type: 'text',
      admin: {
        description:
          'Only keep items whose title or excerpt contains one of these comma-separated words, e.g. "fpv, betaflight, goggles". Use for general drone/tech sites. Empty = keep everything.',
      },
    },
    { name: 'defaultTags', type: 'select', hasMany: true, options: NEWS_TAGS },
    { name: 'active', type: 'checkbox', defaultValue: true },
    {
      type: 'collapsible',
      label: 'Firmware versions (GitHub sources, updated on every fetch)',
      admin: { condition: (data) => data?.type === 'github', initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'stableVersion', type: 'text', admin: { readOnly: true } },
            { name: 'stableUrl', type: 'text', admin: { readOnly: true } },
            { name: 'stableDate', type: 'date', admin: { readOnly: true } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'preVersion', type: 'text', admin: { readOnly: true, description: 'Only when newer than the stable release' } },
            { name: 'preUrl', type: 'text', admin: { readOnly: true } },
            { name: 'preDate', type: 'date', admin: { readOnly: true } },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'lastFetchedAt', type: 'date', admin: { readOnly: true } },
        { name: 'lastError', type: 'text', admin: { readOnly: true } },
      ],
    },
  ],
}
