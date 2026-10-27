import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Local server standing in for a marketplace; no live requests.
let server: Server
let base: string
const hits: string[] = []

beforeAll(async () => {
  vi.stubEnv('DEALS_MIN_INTERVAL_MS', '0')
  server = createServer((req, res) => {
    hits.push(`${req.url} ${req.headers['user-agent']}`)
    if (req.url === '/robots.txt') return res.end('User-agent: *\nDisallow: /private\n')
    if (req.url === '/limited') {
      res.statusCode = 429
      return res.end('slow down')
    }
    res.end(`ok ${req.url}`)
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

describe('politeFetch', () => {
  it('fetches allowed pages with our user agent and caches them', async () => {
    const { politeFetch, USER_AGENT } = await import('@/lib/deals/http')
    expect(await politeFetch(`${base}/search?q=fpv`)).toBe('ok /search?q=fpv')
    expect(await politeFetch(`${base}/search?q=fpv`)).toBe('ok /search?q=fpv')
    expect(hits.filter((h) => h.startsWith('/search?q=fpv'))).toHaveLength(1)
    expect(hits.every((h) => h.endsWith(USER_AGENT))).toBe(true)
  })

  it('refuses paths disallowed by robots.txt without requesting them', async () => {
    const { politeFetch, BlockedError } = await import('@/lib/deals/http')
    await expect(politeFetch(`${base}/private/listing`)).rejects.toBeInstanceOf(BlockedError)
    expect(hits.some((h) => h.startsWith('/private'))).toBe(false)
    expect(hits.filter((h) => h.startsWith('/robots.txt'))).toHaveLength(1)
  })

  it('backs off from a host after a 429 instead of retrying', async () => {
    const { politeFetch } = await import('@/lib/deals/http')
    await expect(politeFetch(`${base}/limited`)).rejects.toThrow(/HTTP 429.*6 hours/)
    const before = hits.length
    await expect(politeFetch(`${base}/search?q=other`)).rejects.toThrow(/paused until/)
    expect(hits.length).toBe(before)
  })
})
