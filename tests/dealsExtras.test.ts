import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { FAILURE_THRESHOLD, nextHealth } from '@/lib/deals/health'
import { dealWarning, findDuplicate } from '@/lib/deals/quality'
import { distanceKm } from '@/lib/geo'

describe('source health', () => {
  it('resets failures on success', () => {
    expect(nextHealth({ consecutiveFailures: 3, paused: false }, { found: 12 }).data).toMatchObject({
      consecutiveFailures: 0,
      lastFound: 12,
    })
  })

  it('pauses on the 5th failure in a row, and only trips once', () => {
    let state = { consecutiveFailures: 0, paused: false }
    const trips: boolean[] = []
    for (let i = 0; i < FAILURE_THRESHOLD + 2; i++) {
      const { data, tripped } = nextHealth(state, { error: 'HTTP 500' })
      trips.push(tripped)
      state = { consecutiveFailures: data.consecutiveFailures, paused: state.paused || ('paused' in data && Boolean(data.paused)) }
    }
    expect(trips).toEqual([false, false, false, false, true, false, false])
    expect(state).toEqual({ consecutiveFailures: 7, paused: true })
  })
})

describe('deal warnings', () => {
  it('flags prices far below new', () => {
    expect(dealWarning({ discountPct: 75 })).toMatch(/75% below the new price/)
    expect(dealWarning({ discountPct: 50 })).toBeNull()
    expect(dealWarning({ discountPct: null })).toBeNull()
  })

  it('flags big discounts from new or low-rated sellers', () => {
    expect(dealWarning({ discountPct: 45, sellerFeedbackScore: 2 })).toMatch(/new seller/)
    expect(dealWarning({ discountPct: 45, sellerFeedbackScore: 300, sellerFeedbackPct: 91 })).toMatch(/low-rated seller/)
    expect(dealWarning({ discountPct: 45, sellerFeedbackScore: 300, sellerFeedbackPct: 99.5 })).toBeNull()
    expect(dealWarning({ discountPct: 10, sellerFeedbackScore: 0 })).toBeNull()
  })
})

describe('cross-site duplicates', () => {
  const others = [
    { id: 1, title: 'DJI O3 Air Unit used, like new', source: 'marktplaats', priceEur: 150 },
    { id: 2, title: 'Radiomaster Boxer ELRS', source: 'vinted', priceEur: 95 },
  ]

  it('matches the same item on another site at a similar price', () => {
    expect(findDuplicate({ title: 'DJI O3 Air Unit - like new, used', source: 'vinted', priceEur: 155 }, others)?.id).toBe(1)
  })

  it('ignores the same site, different prices and different items', () => {
    expect(findDuplicate({ title: 'DJI O3 Air Unit used, like new', source: 'marktplaats', priceEur: 150 }, others)).toBeNull()
    expect(findDuplicate({ title: 'DJI O3 Air Unit used, like new', source: 'vinted', priceEur: 200 }, others)).toBeNull()
    expect(findDuplicate({ title: 'Walksnail Avatar goggles', source: 'ebay', priceEur: 150 }, others)).toBeNull()
    expect(findDuplicate({ title: 'DJI O3 Air Unit', source: 'ebay', priceEur: null }, others)).toBeNull()
  })
})

describe('distance', () => {
  it('computes great-circle distance in km', () => {
    const utrecht = { lat: 52.0907, lon: 5.1214 }
    const amsterdam = { lat: 52.3676, lon: 4.9041 }
    const berlin = { lat: 52.52, lon: 13.405 }
    expect(distanceKm(utrecht, amsterdam)).toBe(34)
    expect(distanceKm(utrecht, berlin)).toBe(565)
    expect(distanceKm(utrecht, utrecht)).toBe(0)
  })
})

describe('per-search schedule', () => {
  it('runs a search when its interval has passed (with 5 min slack)', async () => {
    const { isDue } = await import('@/lib/deals/run')
    const now = Date.parse('2026-10-28T12:00:00Z')
    expect(isDue({ lastRunAt: null, runEveryHours: 3 }, now)).toBe(true)
    expect(isDue({ lastRunAt: '2026-10-28T09:03:00Z', runEveryHours: 3 }, now)).toBe(true)
    expect(isDue({ lastRunAt: '2026-10-28T10:00:00Z', runEveryHours: 3 }, now)).toBe(false)
    expect(isDue({ lastRunAt: '2026-10-28T11:00:00Z', runEveryHours: 1 }, now)).toBe(true)
  })
})

describe('notifications', () => {
  let server: Server
  const received: { url?: string; headers: Record<string, unknown>; body: string }[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        received.push({ url: req.url, headers: req.headers, body })
        res.end('ok')
      })
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    vi.stubEnv('NTFY_URL', `${base}/fpv-deals`)
    vi.stubEnv('NTFY_TOKEN', 'tk_secret')
    vi.stubEnv('DISCORD_WEBHOOK_URL', `${base}/discord`)
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
  })

  afterAll(() => {
    server.close()
    vi.unstubAllEnvs()
  })

  it('pushes to ntfy with an ASCII title, click URL and token', async () => {
    const { sendPush, pushConfigured } = await import('@/lib/notify')
    expect(pushConfigured()).toBe(true)
    await sendPush({ title: 'Deal: €149 DJI O3 – München', message: '29% below new', url: 'https://ebay.de/itm/1' })
    const msg = received.find((r) => r.url === '/fpv-deals')!
    expect(msg.body).toBe('29% below new')
    expect(msg.headers).toMatchObject({ title: 'Deal: 149 DJI O3  Munchen', click: 'https://ebay.de/itm/1', authorization: 'Bearer tk_secret' })
  })

  it('posts firmware news to a Discord webhook as an embed', async () => {
    const { postToChannels } = await import('@/lib/notify')
    await postToChannels({ title: 'Betaflight 4.6.1', message: 'New firmware release', url: 'https://site/news/bf' })
    const msg = received.find((r) => r.url === '/discord')!
    expect(JSON.parse(msg.body).embeds[0]).toMatchObject({ title: 'Betaflight 4.6.1', url: 'https://site/news/bf' })
  })

  it('escapes Telegram MarkdownV2', async () => {
    const { escapeMarkdown } = await import('@/lib/notify')
    expect(escapeMarkdown('€149 (29% off) - DJI_O3.')).toBe('€149 \\(29% off\\) \\- DJI\\_O3\\.')
  })
})
