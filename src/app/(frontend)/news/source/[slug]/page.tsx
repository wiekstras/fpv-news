import config from '@payload-config'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'
import { NewsFeed } from '@/components/NewsFeed'
import { getFeed, getSources } from '@/lib/news/feed'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }

const getSource = cache(async (slug: string) => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'sources', where: { slug: { equals: slug } }, limit: 1 })
  return docs[0]
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const source = await getSource((await params).slug)
  if (!source) return {}
  return { title: `News from ${source.name}`, alternates: { canonical: `/news/source/${source.slug}` } }
}

export default async function SourcePage({ params, searchParams }: Props) {
  const source = await getSource((await params).slug)
  if (!source) notFound()
  const { page } = await searchParams
  const [result, sources] = await Promise.all([
    getFeed({ sourceId: source.id, page: Number(page) || 1 }),
    getSources(),
  ])
  return (
    <>
      <h1 className="text-3xl font-bold">
        <span className="osd mr-2 align-middle text-signal">SOURCE</span>
        {source.name}
      </h1>
      {source.siteUrl && (
        <a href={source.siteUrl} rel="noopener" className="mt-1 inline-block text-sm text-muted hover:text-accent">
          {source.siteUrl.replace(/^https?:\/\//, '')} ↗
        </a>
      )}
      <div className="mt-6">
        <NewsFeed result={result} basePath={`/news/source/${source.slug}`} sources={sources} activeSource={source.slug} />
      </div>
    </>
  )
}
