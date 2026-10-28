import config from '@payload-config'
import { getPayload } from 'payload'

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl|wget/i

// Shop links on build pages point here: count the click, then send the visitor to the shop.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const link = await payload
    .findByID({ collection: 'affiliate-links', id: Number((await params).id), depth: 0 })
    .catch(() => null)
  if (!link || link.active === false) return Response.redirect(new URL('/builds', request.url), 302)

  if (!BOT.test(request.headers.get('user-agent') ?? '')) {
    const build = Number(new URL(request.url).searchParams.get('b')) || undefined
    await payload.create({ collection: 'affiliate-clicks', data: { affiliateLink: link.id, build } }).catch(() => {})
    await payload.update({ collection: 'affiliate-links', id: link.id, data: { clicks: (link.clicks ?? 0) + 1 } }).catch(() => {})
  }
  return new Response(null, { status: 302, headers: { location: link.url, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } })
}
