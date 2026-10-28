import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import { formatDate } from '@/lib/news/feed'

export const metadata: Metadata = {
  title: 'FPV firmware versions: Betaflight, INAV, ExpressLRS, EdgeTX and more',
  description: 'The latest stable and pre-release versions of FPV firmware, updated automatically from the official release pages.',
  alternates: { canonical: '/firmware' },
}

const ageDays = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null)

export default async function FirmwarePage() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'sources',
    where: { type: { equals: 'github' }, active: { equals: true } },
    sort: 'name',
    pagination: false,
    depth: 0,
  })

  return (
    <div className="mx-auto max-w-4xl">
      <p className="osd text-signal">Firmware tracker</p>
      <h1 className="mt-1 text-3xl font-bold">Latest FPV firmware versions</h1>
      <p className="mt-2 text-muted">Straight from each project&apos;s official release page, checked every 15 minutes.</p>

      <div className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead className="osd text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Latest stable</th>
              <th className="px-4 py-3">Newer pre-release</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((s) => {
              const age = ageDays(s.stableDate)
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/news/source/${s.slug}`} className="font-semibold hover:text-accent">{s.name}</Link>
                    {s.siteUrl && (
                      <a href={s.siteUrl} rel="noopener" className="block text-sm text-muted hover:text-accent">
                        {s.siteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.stableVersion ? (
                      <>
                        <a href={s.stableUrl ?? undefined} rel="noopener" className="font-mono text-lg font-bold text-accent hover:underline">
                          {s.stableVersion}
                        </a>
                        <span className="osd block text-muted">
                          {formatDate(s.stableDate!)}
                          {age !== null && age <= 14 ? ' · new' : ''}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">not fetched yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.preVersion ? (
                      <>
                        <a href={s.preUrl ?? undefined} rel="noopener" className="font-mono text-signal hover:underline">{s.preVersion}</a>
                        <span className="osd block text-muted">{formatDate(s.preDate!)} · test at your own risk</span>
                      </>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">
        Pre-releases (RC, beta) are only listed when they are newer than the latest stable release.
      </p>
    </div>
  )
}
