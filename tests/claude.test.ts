import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// A local stand-in for the Claude API: records requests, answers like the Messages API.
let server: Server
const requests: { url?: string; headers: Record<string, unknown>; body: any }[] = []
let reply = ''

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      requests.push({ url: req.url, headers: req.headers, body: JSON.parse(raw) })
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          model: 'claude-opus-5-5',
          content: [{ type: 'text', text: reply }],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      )
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  vi.stubEnv('ANTHROPIC_BASE_URL', `http://127.0.0.1:${(server.address() as AddressInfo).port}`)
  vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

describe('Claude digest intro', () => {
  it('sends the week’s items with low effort and server-side fallback, returns the text', async () => {
    reply = '  Betaflight 4.6.1 landed and a tough budget 5" build stole the show.  '
    const { writeDigestIntro } = await import('@/lib/newsletter/intro')
    const intro = await writeDigestIntro({
      featured: { title: 'Budget 5"', url: 'https://s/b', text: 'Tough', meta: '5"' },
      entries: [{ kind: 'news', title: 'Betaflight 4.6.1', url: 'https://s/n', text: 'Bug fixes', source: 'Betaflight' }],
    })
    expect(intro).toBe('Betaflight 4.6.1 landed and a tough budget 5" build stole the show.')
    const req = requests.at(-1)!
    expect(req.body).toMatchObject({ model: 'claude-opus-5-5', output_config: { effort: 'low' }, fallbacks: 'default' })
    expect(req.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01')
    expect(req.body.messages[0].content).toContain('Featured build: Budget 5" – Tough')
    expect(req.body.messages[0].content).toContain('News (Betaflight): Betaflight 4.6.1 – Bug fixes')
  })

  it('does nothing for an empty digest', async () => {
    const { writeDigestIntro } = await import('@/lib/newsletter/intro')
    const before = requests.length
    expect(await writeDigestIntro({ featured: null, entries: [] })).toBeNull()
    expect(requests.length).toBe(before)
  })
})

describe('Claude news summary', () => {
  it('asks for structured JSON and parses summary + tags', async () => {
    reply = JSON.stringify({ summary: 'Bug-fix release for GPS rescue.', tags: ['firmware'] })
    const { summarize } = await import('@/lib/news/summarize')
    expect(await summarize({ title: 'Betaflight 4.6.1', sourceName: 'Betaflight', excerpt: 'Fixed GPS rescue' })).toEqual({
      summary: 'Bug-fix release for GPS rescue.',
      tags: ['firmware'],
    })
    expect(requests.at(-1)!.body.output_config.format.type).toBe('json_schema')
  })
})
