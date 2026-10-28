import type { GlobalConfig } from 'payload'
import { geocode } from '../lib/geo'
import { admins, hiddenFromContributors } from '../access'
import { ADAPTERS } from '../lib/deals/adapters'
import { COUNTRIES, DEAL_SOURCES } from '../lib/deals/options'

export const Settings: GlobalConfig = {
  slug: 'settings',
  admin: { hidden: hiddenFromContributors },
  access: { read: admins, update: admins },
  hooks: {
    beforeChange: [
      // Turn the home location into coordinates for deal distances.
      async ({ data, originalDoc, req }) => {
        const changed = data.homeLocation !== originalDoc?.homeLocation || data.homeCountry !== originalDoc?.homeCountry
        if (!changed) return data
        if (!data.homeLocation) return { ...data, homeLat: null, homeLon: null }
        try {
          const point = await geocode(req.payload, data.homeLocation, data.homeCountry ?? 'NL')
          return { ...data, homeLat: point?.lat ?? null, homeLon: point?.lon ?? null }
        } catch (err) {
          req.payload.logger.warn({ err }, 'Could not geocode the home location')
          return data
        }
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Site',
          fields: [
            { name: 'siteName', type: 'text', required: true, defaultValue: 'FPV News' },
            {
              name: 'tagline',
              type: 'text',
              defaultValue: 'FPV news, community builds and a weekly digest.',
            },
            {
              name: 'adminEmail',
              type: 'email',
              admin: { description: 'Where digest-ready notices and deal alerts go.' },
            },
          ],
        },
        {
          label: 'News',
          fields: [
            {
              name: 'claudeSummaries',
              label: 'Generate summaries with Claude',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description:
                  'Generate short summaries and tags with the Claude API (needs ANTHROPIC_API_KEY). When off, items show no summary.',
              },
            },
          ],
        },
        {
          label: 'Deals',
          fields: [
            {
              name: 'enabledDealSources',
              type: 'select',
              hasMany: true,
              defaultValue: ['ebay'],
              options: DEAL_SOURCES.filter((s) => s.value in ADAPTERS || s.value === 'other'),
              admin: {
                description:
                  'Sources the deals radar may query. eBay uses the official API; the others read the sites’ public search pages (leboncoin, Subito, Vinted and Wallapop through a headless browser). Only enable a marketplace if its terms allow it for you or you have its permission.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'homeLocation',
                  type: 'text',
                  admin: { description: 'Your postcode and town, e.g. "3511 Utrecht". Used for distances.' },
                },
                {
                  name: 'homeCountry',
                  type: 'select',
                  defaultValue: 'NL',
                  options: COUNTRIES,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'homeLat', type: 'number', admin: { readOnly: true } },
                { name: 'homeLon', type: 'number', admin: { readOnly: true } },
              ],
            },
            {
              name: 'permittedDealSources',
              type: 'select',
              hasMany: true,
              options: DEAL_SOURCES.filter((s) => s.value in ADAPTERS && s.value !== 'ebay'),
              // (sites in the Marketplaces list have their own permission checkbox)
              admin: {
                description:
                  'Sites that gave you permission for automated searches: their robots.txt is skipped. Request spacing, the clear user agent and stopping at bot checks still apply.',
              },
            },
          ],
        },
        {
          label: 'Newsletter',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'digestDay',
                  type: 'select',
                  required: true,
                  defaultValue: '5',
                  options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                    (label, i) => ({ label, value: String(i) }),
                  ),
                },
                {
                  name: 'digestTime',
                  type: 'text',
                  required: true,
                  defaultValue: '09:00',
                  admin: { description: 'HH:mm, Europe/Amsterdam. The draft is prepared then; you send it.' },
                  validate: (v: string | null | undefined) =>
                    /^([01]\d|2[0-3]):[0-5]\d$/.test(v ?? '') || 'Use HH:mm, e.g. 09:00',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
