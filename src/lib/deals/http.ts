import { isAllowed, parseRobots } from './robots'
import type { Fetcher } from './types'

// Every marketplace request goes through here: clear user agent, robots.txt,
// one request per host every ~10s (with jitter), a short cache and a long
// back-off when a site blocks or rate-limits us. We never retry around a block.
const SITE = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
export const USER_AGENT = `FPVNewsDealsBot/1.0 (+${SITE}${process.env.DEALS_CONTACT_EMAIL ? `; ${process.env.DEALS_CONTACT_EMAIL}` : ''})`

const MIN_INTERVAL_MS = Number(process.env.DEALS_MIN_INTERVAL_MS ?? 8_000)
const JITTER_MS = MIN_INTERVAL_MS / 2
const CACHE_TTL_MS = 15 * 60 * 1000
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000
const BLOCK_BACKOFF_MS = 6 * 60 * 60 * 1000

export class BlockedError extends Error {}

const nextSlot = new Map<string, number>()
const blockedUntil = new Map<string, number>()
const cache = new Map<string, { body: string; at: number }>()
const robots = new Map<string, { rules: ReturnType<typeof parseRobots> | 'deny-all'; at: number }>()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function waitTurn(host: string) {
  const now = Date.now()
  const slot = Math.max(now, nextSlot.get(host) ?? 0)
  nextSlot.set(host, slot + MIN_INTERVAL_MS + Math.random() * JITTER_MS)
  if (slot > now) await sleep(slot - now)
}

async function robotsAllows(url: URL) {
  let entry = robots.get(url.origin)
  if (!entry || Date.now() - entry.at > ROBOTS_TTL_MS) {
    await waitTurn(url.host)
    let rules: ReturnType<typeof parseRobots> | 'deny-all'
    try {
      const res = await fetch(`${url.origin}/robots.txt`, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      })
      // RFC 9309: 4xx means no restrictions, 5xx/unreachable means assume everything is disallowed.
      rules = res.ok ? parseRobots(await res.text(), 'FPVNewsDealsBot') : res.status < 500 ? [] : 'deny-all'
    } catch {
      rules = 'deny-all'
    }
    robots.set(url.origin, (entry = { rules, at: Date.now() }))
  }
  if (entry.rules === 'deny-all') {
    throw new BlockedError(`robots.txt of ${url.host} could not be fetched, so the site is treated as off-limits for now`)
  }
  return isAllowed(entry.rules, url.pathname + url.search)
}

export const politeFetch: Fetcher = async (url, init = {}) => {
  const target = new URL(url)
  const host = target.host
  const until = blockedUntil.get(host) ?? 0
  if (until > Date.now()) throw new BlockedError(`${host} blocked us earlier; paused until ${new Date(until).toISOString()}`)

  const method = init.method ?? 'GET'
  const key = `${method} ${url}`
  const hit = method === 'GET' ? cache.get(key) : undefined
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.body

  if (init.respectRobots !== false && !(await robotsAllows(target))) {
    throw new BlockedError(`robots.txt of ${host} disallows ${target.pathname}`)
  }

  await waitTurn(host)
  const res = await fetch(url, {
    method,
    body: init.body,
    headers: { 'user-agent': USER_AGENT, 'accept-language': 'en;q=0.9,nl;q=0.8,de;q=0.7', ...init.headers },
    signal: AbortSignal.timeout(20_000),
  })
  if (res.status === 403 || res.status === 429 || res.status === 503) {
    blockedUntil.set(host, Date.now() + BLOCK_BACKOFF_MS)
    throw new BlockedError(`${host} answered HTTP ${res.status}; pausing this source for 6 hours`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const body = await res.text()
  if (method === 'GET') cache.set(key, { body, at: Date.now() })
  return body
}
