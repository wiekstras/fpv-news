import { existsSync } from 'fs'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { chromium } from 'playwright-core'

// Real headless Chromium against a local server (no live requests). Skipped when no browser is installed
// (install one with `pnpm exec playwright-core install chromium`).
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || chromium.executablePath()
const hasBrowser = existsSync(CHROMIUM)

let server: Server
let port: number
const hits: string[] = []

beforeAll(async () => {
  vi.stubEnv('DEALS_MIN_INTERVAL_MS', '0')
  vi.stubEnv('PLAYWRIGHT_CHROMIUM_PATH', CHROMIUM)
  server = createServer((req, res) => {
    hits.push(`${req.headers.host}${req.url}`)
    if (req.url === '/robots.txt') return res.end('User-agent: *\nDisallow: /private\n')
    if (req.url?.startsWith('/api/v2/catalog/items')) {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ items: [{ id: 1, title: 'Goggles', price: { amount: '99.0', currency_code: 'EUR' } }] }))
    }
    res.setHeader('content-type', 'text/html')
    if (req.url?.startsWith('/challenge')) {
      return res.end('<html><head><title>Checking</title><script src="https://geo.captcha-delivery.com/captcha/check.js"></script></head><body></body></html>')
    }
    // A page that loads its results with JavaScript, like Vinted/Wallapop.
    res.end(`<html><head><title>Results</title></head><body><div id="r"></div>
      <script>fetch('/api/v2/catalog/items?search_text=x').then(r => r.json()).then(d => { document.getElementById('r').textContent = d.items.length })</script>
      </body></html>`)
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  port = (server.address() as AddressInfo).port
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

describe.skipIf(!hasBrowser)('browserFetch', () => {
  it('renders the page and captures the JSON it loads, with our bot name in the user agent', async () => {
    const { browserFetch } = await import('@/lib/deals/browser')
    const { html, json } = await browserFetch(`http://127.0.0.1:${port}/catalog?search_text=x`, {
      waitForJson: /\/api\/v2\/catalog\/items/,
    })
    expect(html).toContain('<title>Results</title>')
    expect(json).toEqual({ items: [{ id: 1, title: 'Goggles', price: { amount: '99.0', currency_code: 'EUR' } }] })
  }, 60_000)

  it('respects robots.txt unless the site gave permission', async () => {
    const { browserFetch } = await import('@/lib/deals/browser')
    const { BlockedError } = await import('@/lib/deals/http')
    await expect(browserFetch(`http://127.0.0.1:${port}/private/search`)).rejects.toBeInstanceOf(BlockedError)
    expect(hits.some((h) => h.includes('/private'))).toBe(false)
    const { html } = await browserFetch(`http://127.0.0.1:${port}/private/search`, { respectRobots: false })
    expect(html).toContain('Results')
  }, 60_000)

  it('stops at a bot check and pauses that site instead of trying to get past it', async () => {
    const { browserFetch } = await import('@/lib/deals/browser')
    await expect(browserFetch(`http://localhost:${port}/challenge`, { respectRobots: false })).rejects.toThrow(/bot check.*not bypassing/)
    await expect(browserFetch(`http://localhost:${port}/catalog`, { respectRobots: false })).rejects.toThrow(/paused until/)
  }, 60_000)
})
