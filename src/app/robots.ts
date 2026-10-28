import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Rendered per request so the sitemap URL uses the runtime SERVER_URL.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/go/'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
