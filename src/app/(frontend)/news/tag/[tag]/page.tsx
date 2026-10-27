import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NewsFeed } from '@/components/NewsFeed'
import { getFeed, getSources } from '@/lib/news/feed'
import { NEWS_TAGS } from '@/lib/tags'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tag: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  const label = NEWS_TAGS.find((t) => t.value === tag)?.label ?? tag
  return { title: `${label} news`, alternates: { canonical: `/news/tag/${tag}` } }
}

export default async function TagPage({ params, searchParams }: Props) {
  const { tag } = await params
  const { page } = await searchParams
  const meta = NEWS_TAGS.find((t) => t.value === tag)
  if (!meta) notFound()
  const [result, sources] = await Promise.all([getFeed({ tag, page: Number(page) || 1 }), getSources()])
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">
        <span className="osd mr-2 align-middle text-signal">TAG</span>
        {meta.label}
      </h1>
      <NewsFeed result={result} basePath={`/news/tag/${tag}`} sources={sources} activeTag={tag} />
    </>
  )
}
