import type { Browser } from 'playwright-core'
import { beforeRequest, BlockedError, markBlocked, USER_AGENT } from './http'

// Headless Chromium for marketplaces whose search results are rendered by JavaScript.
// Same rules as politeFetch (spacing, back-off, robots.txt unless the site gave permission).
// It identifies itself in the user agent and never tries to get past a bot challenge.
export type BrowserFetcher = (
  url: string,
  options?: { respectRobots?: boolean; waitForJson?: RegExp },
) => Promise<{ html: string; json?: unknown }>

// Markers of bot-check pages: challenge scripts in the HTML, or typical page titles.
const CHALLENGE_HTML = /captcha-delivery\.com|px-captcha|\/cdn-cgi\/challenge-platform|cf-chl-/i
const CHALLENGE_TITLE = /just a moment|are you a robot|access denied|attention required|captcha/i
const IDLE_CLOSE_MS = 60_000

let browser: Promise<Browser> | null = null
let idleTimer: NodeJS.Timeout | undefined

async function getBrowser() {
  clearTimeout(idleTimer)
  if (!browser) {
    const { chromium } = await import('playwright-core')
    browser = chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
    browser.catch(() => (browser = null))
  }
  return browser
}

function scheduleClose() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(async () => {
    const b = browser
    browser = null
    await (await b)?.close().catch(() => {})
  }, IDLE_CLOSE_MS)
}

export const browserFetch: BrowserFetcher = async (url, options = {}) => {
  const target = new URL(url)
  await beforeRequest(target, options.respectRobots !== false)
  const b = await getBrowser()
  const context = await b.newContext({
    userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 ${USER_AGENT}`,
    locale: 'en-GB',
  })
  try {
    const page = await context.newPage()
    const jsonResponse = options.waitForJson
      ? page.waitForResponse((r) => options.waitForJson!.test(r.url()) && r.ok(), { timeout: 25_000 }).catch(() => null)
      : null
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((err: Error) => {
      // Keep the first line ("net::ERR_… at <url>"), not Playwright's call log.
      throw new Error(err.message.split('\n')[0].replace(/^page\.goto: /, ''))
    })
    const status = response?.status() ?? 0
    const html = await page.content()
    if (status === 403 || status === 429 || CHALLENGE_HTML.test(html) || CHALLENGE_TITLE.test(await page.title())) {
      markBlocked(target.host)
      throw new BlockedError(`${target.host} showed a bot check (HTTP ${status}); not bypassing it, pausing this source for 6 hours`)
    }
    if (status >= 400) throw new Error(`HTTP ${status} for ${url}`)
    const matched = jsonResponse ? await jsonResponse : null
    return { html, json: matched ? await matched.json().catch(() => undefined) : undefined }
  } finally {
    await context.close().catch(() => {})
    scheduleClose()
  }
}
