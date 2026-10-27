import config from '@payload-config'
import { getPayload } from 'payload'
import { digestContent, SITE } from '@/lib/newsletter/digest'
import { renderDigest } from '@/lib/newsletter/render'

// Admin-only HTML preview of a digest, shown in an iframe on the digest edit page.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (user?.role !== 'admin') return new Response('Forbidden', { status: 403 })

  const digest = await payload.findByID({ collection: 'digests', id: Number((await params).id), depth: 0 })
  const settings = await payload.findGlobal({ slug: 'settings' })
  const { html } = renderDigest(await digestContent(payload, digest), {
    siteUrl: SITE,
    siteName: settings.siteName,
    unsubscribeUrl: `${SITE}/newsletter/unsubscribe?token=preview`,
  })
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}
