import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { pickNews } from '@/lib/newsletter/pick'
import { renderDigest, type DigestContent } from '@/lib/newsletter/render'
import { lastScheduledAt } from '@/lib/newsletter/schedule'
import { verifyResendWebhook } from '@/lib/newsletter/webhook'

describe('lastScheduledAt (Europe/Amsterdam)', () => {
  it('finds this week’s moment when it has passed', () => {
    // Friday 09:00 Amsterdam = 07:00Z in summer (CEST)
    expect(lastScheduledAt(new Date('2026-07-10T08:00:00Z'), 5, '09:00').toISOString()).toBe('2026-07-10T07:00:00.000Z')
  })

  it('falls back to last week when today’s moment has not come yet', () => {
    expect(lastScheduledAt(new Date('2026-07-10T06:59:00Z'), 5, '09:00').toISOString()).toBe('2026-07-03T07:00:00.000Z')
  })

  it('uses winter time after the DST change', () => {
    // Friday 30 Oct 2026, 09:00 CET = 08:00Z
    expect(lastScheduledAt(new Date('2026-11-02T12:00:00Z'), 5, '09:00').toISOString()).toBe('2026-10-30T08:00:00.000Z')
  })

  it('handles a Sunday schedule late on Sunday evening', () => {
    // 22:30Z on Sunday 1 Nov = 23:30 Sunday in Amsterdam
    expect(lastScheduledAt(new Date('2026-11-01T22:30:00Z'), 0, '23:00').toISOString()).toBe('2026-11-01T22:00:00.000Z')
  })
})

describe('pickNews', () => {
  it('keeps order, caps items per source and in total', () => {
    const items = [1, 1, 1, 2, 3, 2, 2, 4].map((source, i) => ({ id: i, source }))
    expect(pickNews(items, 5, 2).map((i) => i.id)).toEqual([0, 1, 3, 4, 5])
  })
})

describe('renderDigest', () => {
  const content: DigestContent = {
    subject: 'FPV weekly',
    intro: 'Hello <pilots>\n\nSecond paragraph',
    featured: { title: 'Budget 5"', url: 'https://site/builds/b', text: 'Tough & cheap', image: 'https://site/img.jpg', meta: '5" · Beginner' },
    entries: [
      { kind: 'news', title: 'Betaflight 4.6', url: 'https://site/news/bf', text: 'New release', source: 'Betaflight' },
      { kind: 'build', title: 'Whoop', url: 'https://site/builds/w', meta: 'Whoop' },
    ],
  }
  const { html, text } = renderDigest(content, { siteUrl: 'https://site', siteName: 'FPV News', unsubscribeUrl: 'https://site/u?token=abc' })

  it('escapes content and includes every section', () => {
    expect(html).toContain('Hello &lt;pilots&gt;')
    expect(html).toContain('Tough &amp; cheap')
    expect(html).toContain('Budget 5&quot;')
    expect(html).toContain('This week in FPV')
    expect(html).toContain('Fresh community builds')
    expect(html).toContain('href="https://site/news/bf"')
  })

  it('has an unsubscribe link in both versions', () => {
    expect(html).toContain('href="https://site/u?token=abc"')
    expect(text).toContain('Unsubscribe: https://site/u?token=abc')
    expect(text).toContain('FEATURED BUILD: Budget 5"')
  })

  it('leaves out empty sections', () => {
    const minimal = renderDigest({ subject: 's', entries: [] }, { siteUrl: 'https://s', siteName: 'n', unsubscribeUrl: 'https://s/u' })
    expect(minimal.html).not.toContain('This week in FPV')
    expect(minimal.html).not.toContain('Featured build')
  })
})

describe('verifyResendWebhook', () => {
  const secret = `whsec_${Buffer.from('test-secret-key').toString('base64')}`
  const body = '{"type":"email.opened","data":{"email_id":"abc"}}'
  const now = 1_800_000_000_000
  const sign = (id: string, ts: number, b: string) =>
    createHmac('sha256', Buffer.from('test-secret-key')).update(`${id}.${ts}.${b}`).digest('base64')

  it('accepts a valid signature (also among several)', () => {
    const ts = now / 1000
    const signature = `v1,bm9wZQ== v1,${sign('msg_1', ts, body)}`
    expect(verifyResendWebhook(secret, { id: 'msg_1', timestamp: String(ts), signature }, body, now)).toBe(true)
  })

  it('rejects a tampered body, wrong secret, old timestamp or missing headers', () => {
    const ts = now / 1000
    const signature = `v1,${sign('msg_1', ts, body)}`
    expect(verifyResendWebhook(secret, { id: 'msg_1', timestamp: String(ts), signature }, body.replace('abc', 'xyz'), now)).toBe(false)
    expect(verifyResendWebhook('whsec_b3RoZXI=', { id: 'msg_1', timestamp: String(ts), signature }, body, now)).toBe(false)
    expect(verifyResendWebhook(secret, { id: 'msg_1', timestamp: String(ts - 600), signature: `v1,${sign('msg_1', ts - 600, body)}` }, body, now)).toBe(false)
    expect(verifyResendWebhook(secret, { id: null, timestamp: String(ts), signature }, body, now)).toBe(false)
  })
})
