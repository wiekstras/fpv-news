const USER_AGENT = `FPVNewsBot/1.0 (+${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'})`

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
