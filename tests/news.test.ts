import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { autoTags } from '@/lib/news/autoTags'
import { canonicalizeUrl } from '@/lib/news/canonical'
import { isNearDuplicate, normalizeTitle, titleSimilarity } from '@/lib/news/dedupe'
import { extractPageMeta } from '@/lib/news/pageMeta'
import { parseFeed } from '@/lib/news/parseFeed'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/news/${name}`, import.meta.url), 'utf8')

describe('parseFeed', () => {
  it('parses a YouTube channel feed with thumbnails, newest first', async () => {
    const entries = await parseFeed(fixture('youtube.xml'))
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      title: 'New Goggles Announced!',
      url: 'https://www.youtube.com/watch?v=def456UVW12',
      thumbnailUrl: 'https://i3.ytimg.com/vi/def456UVW12/hqdefault.jpg',
      description: 'First look at the new goggles.',
    })
    expect(entries[1].publishedAt.toISOString()).toBe('2026-10-20T14:00:12.000Z')
  })

  it('parses GitHub releases and strips HTML from the notes', async () => {
    const [latest] = await parseFeed(fixture('github-releases.atom'))
    expect(latest.title).toBe('4.6.1')
    expect(latest.url).toBe('https://github.com/betaflight/betaflight/releases/tag/4.6.1')
    expect(latest.description).toContain('Fixed GPS rescue')
    expect(latest.description).not.toContain('<li>')
  })

  it('parses RSS with content:encoded images and image enclosures, skipping undated items', async () => {
    const entries = await parseFeed(fixture('blog-rss.xml'))
    expect(entries.map((e) => e.title)).toEqual([
      'EASA Publishes New Drone Rules for 2027',
      'Review: The Best 5 Inch Frame of the Year',
    ])
    expect(entries[0].thumbnailUrl).toBe('https://www.example-fpv.com/img/easa.jpg')
    expect(entries[1].thumbnailUrl).toBe('https://www.example-fpv.com/img/frame.png')
  })
})

describe('extractPageMeta', () => {
  it('resolves a relative canonical link and prefers og:image', () => {
    expect(extractPageMeta(fixture('article.html'), 'https://www.example-fpv.com/easa-rules-2027/?utm_source=rss')).toEqual({
      canonicalUrl: 'https://www.example-fpv.com/easa-rules-2027/',
      imageUrl: 'https://cdn.example-fpv.com/og/easa.jpg',
    })
  })
})

describe('canonicalizeUrl', () => {
  it('drops tracking params, www, fragments and trailing slashes', () => {
    expect(canonicalizeUrl('http://WWW.Example.com/post/?utm_source=rss&utm_medium=feed&id=3#comments')).toBe(
      'https://example.com/post?id=3',
    )
  })

  it('treats the same link with and without tracking as equal', () => {
    expect(canonicalizeUrl('https://example.com/a/?fbclid=xyz')).toBe(canonicalizeUrl('https://www.example.com/a'))
  })

  it('normalizes YouTube links to one form', () => {
    const expected = 'https://youtube.com/watch?v=abc123XYZ09'
    expect(canonicalizeUrl('https://youtu.be/abc123XYZ09?si=share')).toBe(expected)
    expect(canonicalizeUrl('https://m.youtube.com/watch?v=abc123XYZ09&feature=shared&t=30')).toBe(expected)
  })

  it('keeps meaningful query params in a stable order', () => {
    expect(canonicalizeUrl('https://example.com/?b=2&a=1')).toBe('https://example.com/?a=1&b=2')
  })
})

describe('title dedupe', () => {
  it('normalizes case, accents and punctuation but keeps version numbers', () => {
    expect(normalizeTitle('Betaflight 4.5.1 – Released!')).toBe('betaflight 4.5.1 released')
    expect(normalizeTitle('Café Drone… Reviewed')).toBe('cafe drone reviewed')
  })

  it('flags near-identical headlines from different outlets', () => {
    const existing = [normalizeTitle('DJI announces the new O4 Air Unit Pro for FPV')]
    expect(isNearDuplicate(normalizeTitle('DJI Announces New O4 Air Unit Pro for FPV!'), existing)).toBe(true)
  })

  it('does not merge different firmware versions', () => {
    const existing = [normalizeTitle('Betaflight 4.5.1')]
    expect(isNearDuplicate(normalizeTitle('Betaflight 4.5.2'), existing)).toBe(false)
    expect(titleSimilarity('betaflight 4.5.1 released now', 'betaflight 4.5.2 released now')).toBeLessThan(0.8)
  })

  it('only matches short titles exactly', () => {
    expect(isNearDuplicate('new goggles', ['new goggles'])).toBe(true)
    expect(isNearDuplicate('new goggles today', ['new goggles'])).toBe(false)
  })

  it('does not flag unrelated stories', () => {
    const existing = [normalizeTitle('EASA publishes new drone rules for 2027')]
    expect(isNearDuplicate(normalizeTitle('Review of the best 5 inch frame of the year'), existing)).toBe(false)
  })
})

describe('autoTags', () => {
  it('tags GitHub releases as firmware and YouTube as video', () => {
    expect(autoTags('github', [], 'INAV 8.0.0')).toContain('firmware')
    expect(autoTags('youtube', [], 'Flying in the snow')).toEqual(['video'])
  })

  it('applies keyword rules and source defaults without duplicates', () => {
    expect(autoTags('rss', ['regulation'], 'EASA publishes new drone rules').sort()).toEqual(['regulation'])
    expect(autoTags('rss', [], 'How to set up ExpressLRS').sort()).toEqual(['firmware', 'tutorial'])
    expect(autoTags('blog', [], 'Introducing our new 3 inch frame')).toEqual(['new-gear'])
  })

  it('does not match words that merely start like a keyword', () => {
    expect(autoTags('rss', [], 'More bandwidth for analog video links')).toEqual([])
  })
})
