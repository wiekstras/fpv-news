import type { GlobalConfig } from 'payload'
import { admins, hiddenFromContributors } from '../access'

export const Settings: GlobalConfig = {
  slug: 'settings',
  admin: { hidden: hiddenFromContributors },
  access: { read: admins, update: admins },
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
