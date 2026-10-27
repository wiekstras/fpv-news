// Query parameters that only track where a click came from.
const TRACKING_PARAMS = /^(utm_.*|fbclid|gclid|dclid|mc_cid|mc_eid|igshid|ref|ref_src|_hsenc|_hsmi)$/i

// Normalize a URL so the same article reached via different links compares equal.
export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw.trim())
  url.protocol = 'https:'
  url.hostname = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
  url.hash = ''
  url.port = ''

  // YouTube: youtu.be/ID and watch?v=ID&si=… all become youtube.com/watch?v=ID
  if (url.hostname === 'youtu.be') return `https://youtube.com/watch?v=${url.pathname.slice(1)}`
  if (url.hostname === 'youtube.com' && url.pathname === '/watch') {
    return `https://youtube.com/watch?v=${url.searchParams.get('v')}`
  }

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key)
  }
  url.searchParams.sort()
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString()
}
