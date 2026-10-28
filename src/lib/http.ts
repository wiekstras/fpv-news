import { SITE_URL } from './site'

const USER_AGENT = `FPVNewsBot/1.0 (+${SITE_URL})`

// Plain GET with our user agent and a timeout. Throws on non-2xx responses.
export async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: '*/*' },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}
