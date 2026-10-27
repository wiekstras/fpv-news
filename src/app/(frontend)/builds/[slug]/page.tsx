import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'
import { AffiliateDisclosure } from '@/components/AffiliateDisclosure'
import { BuildContent } from '@/components/BuildContent'
import { PartsList } from '@/components/PartsList'
import { DIFFICULTIES, FRAME_SIZES, optionLabel } from '@/lib/builds/options'
import { catalogPartIds, hasAffiliateLinks, resolveParts } from '@/lib/builds/parts'
import { formatDate } from '@/lib/news/feed'
import { BUILD_TAGS } from '@/lib/tags'
import type { Media } from '@/payload-types'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const getBuild = cache(async (slug: string) => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'builds',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  return docs[0]
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const build = await getBuild((await params).slug)
  if (!build) return {}
  const photo = build.photos?.[0] as Media | undefined
  return {
    title: build.title,
    description: build.excerpt ?? undefined,
    alternates: { canonical: `/builds/${build.slug}` },
    openGraph: {
      type: 'article',
      title: build.title,
      description: build.excerpt ?? undefined,
      publishedTime: build.publishedAt ?? undefined,
      images: photo?.url ? [photo.sizes?.large?.url ?? photo.url] : undefined,
    },
  }
}

export default async function BuildPage({ params }: Props) {
  const build = await getBuild((await params).slug)
  if (!build) notFound()

  const payload = await getPayload({ config })
  const partIds = catalogPartIds(build.parts)
  const { docs: links } = partIds.length
    ? await payload.find({
        collection: 'affiliate-links',
        where: { part: { in: partIds }, active: { equals: true } },
        pagination: false,
        depth: 1,
      })
    : { docs: [] }
  const rows = resolveParts(build.parts, links)
  const showDisclosure = hasAffiliateLinks(rows)

  const photos = (build.photos ?? []) as Media[]
  const [hero, ...rest] = photos

  return (
    <article className="mx-auto max-w-4xl">
      {showDisclosure && <AffiliateDisclosure />}

      <header className="mt-6">
        <p className="osd text-signal">
          <Link href={`/builds?frame=${encodeURIComponent(build.frameSize)}`} className="hover:underline">
            {optionLabel(FRAME_SIZES, build.frameSize)}
          </Link>
          {' · '}
          <Link href={`/builds?difficulty=${build.difficulty}`} className="hover:underline">
            {optionLabel(DIFFICULTIES, build.difficulty)}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl leading-tight font-bold sm:text-4xl">{build.title}</h1>
        <p className="osd mt-3 text-muted">
          {[build.authorName && `By ${build.authorName}`, build.publishedAt && formatDate(build.publishedAt)]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {!!build.tags?.length && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {build.tags.map((tag) => (
              <li key={tag} className="osd rounded border border-border px-2 py-0.5">{optionLabel(BUILD_TAGS, tag)}</li>
            ))}
          </ul>
        )}
      </header>

      {hero?.url && (
        <img src={hero.sizes?.large?.url ?? hero.url} alt={hero.alt} className="mt-6 w-full rounded-lg" />
      )}
      {rest.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rest.map((photo) => (
            <a key={photo.id} href={photo.url ?? undefined} target="_blank" rel="noopener">
              <img src={photo.sizes?.thumb?.url ?? photo.url ?? ''} alt={photo.alt} loading="lazy" className="aspect-[3/2] w-full rounded-md object-cover" />
            </a>
          ))}
        </div>
      )}

      {build.excerpt && <p className="mt-8 text-lg">{build.excerpt}</p>}

      <div className="mt-8">
        <BuildContent data={build.content} />
      </div>

      {rows.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-bold">Parts list</h2>
          {showDisclosure && (
            <p className="mb-3 text-sm text-muted">Shop links are affiliate links (see the disclosure above).</p>
          )}
          <PartsList rows={rows} />
        </section>
      )}
    </article>
  )
}
