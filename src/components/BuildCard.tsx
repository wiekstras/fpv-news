import Link from 'next/link'
import { DIFFICULTIES, FRAME_SIZES, optionLabel } from '@/lib/builds/options'
import type { Build, Media } from '@/payload-types'

export function BuildCard({ build }: { build: Build }) {
  const photo = build.photos?.[0] as Media | undefined
  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-surface">
      <Link href={`/builds/${build.slug}`}>
        {photo?.url ? (
          <img
            src={photo.sizes?.thumb?.url ?? photo.url}
            alt={photo.alt}
            loading="lazy"
            className="aspect-[3/2] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[3/2] items-center justify-center">
            <span className="osd text-accent">NO PHOTO</span>
          </div>
        )}
        <div className="p-4">
          <p className="osd text-signal">
            {optionLabel(FRAME_SIZES, build.frameSize)} · {optionLabel(DIFFICULTIES, build.difficulty)}
          </p>
          <h2 className="mt-1 text-lg leading-snug font-semibold group-hover:text-accent">{build.title}</h2>
          {build.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">{build.excerpt}</p>}
          {build.authorName && <p className="osd mt-3 text-muted">By {build.authorName}</p>}
        </div>
      </Link>
    </article>
  )
}
