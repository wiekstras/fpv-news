import { NewsFeed } from '@/components/NewsFeed'
import { getFeed, getSources } from '@/lib/news/feed'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams
  const [result, sources] = await Promise.all([getFeed({ page: Number(page) || 1 }), getSources()])
  return (
    <>
      <section className="pb-8">
        <p className="osd text-signal">REC ● Live from the FPV world</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">FPV news, all in one feed</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Firmware releases, new gear, videos and guides from around the hobby. Short summaries, always linking to the original.
        </p>
      </section>
      <NewsFeed result={result} basePath="/" sources={sources} />
    </>
  )
}
