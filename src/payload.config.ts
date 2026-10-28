import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AffiliateLinks } from './collections/AffiliateLinks'
import { Builds } from './collections/Builds'
import { Digests } from './collections/Digests'
import { EmailEvents } from './collections/EmailEvents'
import { FxRates } from './collections/FxRates'
import { Listings } from './collections/Listings'
import { Marketplaces } from './collections/Marketplaces'
import { Media } from './collections/Media'
import { NewsItems } from './collections/NewsItems'
import { Parts } from './collections/Parts'
import { Retailers } from './collections/Retailers'
import { SavedSearches } from './collections/SavedSearches'
import { Sources } from './collections/Sources'
import { Subscribers } from './collections/Subscribers'
import { Users } from './collections/Users'
import { Settings } from './globals/Settings'
import { fetchFxRates, runDeals } from './jobs/deals'
import { fetchNews } from './jobs/fetchNews'
import { prepareDigest } from './jobs/prepareDigest'
import { migrations } from './migrations'
import { SITE_URL } from './lib/site'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  serverURL: SITE_URL,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · FPV News' },
    components: {
      afterNavLinks: ['/admin/DealsClient#DealsNavLink'],
      views: {
        deals: { Component: '/admin/DealsView#DealsView', path: '/deals', meta: { title: 'Deals radar' } },
      },
    },
  },
  collections: [
    NewsItems,
    Sources,
    Builds,
    Media,
    Parts,
    Retailers,
    AffiliateLinks,
    Subscribers,
    Digests,
    EmailEvents,
    SavedSearches,
    Listings,
    Marketplaces,
    FxRates,
    Users,
  ],
  globals: [Settings],
  jobs: {
    tasks: [fetchNews, runDeals, fetchFxRates, prepareDigest],
    // Each cron tick queues due scheduled tasks and runs what is in the queue.
    autoRun: [
      { cron: '* * * * *', queue: 'news' },
      { cron: '* * * * *', queue: 'deals' },
      { cron: '* * * * *', queue: 'newsletter' },
    ],
    access: { run: ({ req }) => req.user?.role === 'admin' },
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    migrationDir: path.resolve(dirname, 'migrations'),
    // In production, pending migrations run automatically on startup.
    prodMigrations: migrations,
  }),
  // Without RESEND_API_KEY, Payload logs outgoing emails to the console.
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'hello@example.com',
        defaultFromName: process.env.EMAIL_FROM_NAME || 'FPV News',
      })
    : undefined,
  sharp,
  plugins: [
    // Railway bucket (S3-compatible). Falls back to local ./media when S3_BUCKET is unset.
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET),
      collections: { media: true },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'auto',
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
