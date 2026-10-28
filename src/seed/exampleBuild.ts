import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload } from 'payload'
import sharp from 'sharp'
import type { Part } from '@/payload-types'

const SLUG = 'budget-5-inch-freestyle-build'

// Placeholder retailers: replace the URLs with your real affiliate links in the admin.
const RETAILERS = [
  { name: 'Example Shop EU', url: 'https://example.com', country: 'EU' },
  { name: 'Example Shop NL', url: 'https://example.org', country: 'NL' },
]

const PARTS: (Pick<Part, 'name' | 'brand' | 'category'> & { shops: number[] })[] = [
  { brand: 'TBS', name: 'Source One V5 5" frame', category: 'frame', shops: [0, 1] },
  { brand: 'T-Motor', name: 'Velox V2207.5 1950KV', category: 'motors', shops: [0] },
  { brand: 'SpeedyBee', name: 'F405 V4 stack', category: 'stack', shops: [0, 1] },
  { brand: 'Walksnail', name: 'Avatar HD Pro Kit', category: 'vtx', shops: [1] },
  { brand: 'RadioMaster', name: 'RP1 ExpressLRS 2.4GHz', category: 'receiver', shops: [0] },
  { brand: 'HQProp', name: '5.1x3.5x3 props', category: 'props', shops: [] },
]

const MARKDOWN = `## Why this build

I wanted a tough, cheap-to-repair 5" freestyle quad that flies well on stock tune. Everything here is easy to find in Europe and the frame arms cost a few euros to replace.

## Build notes

- Mount the stack with the soft-mount gummies, USB port facing the rear.
- Run the motor wires under the arms and protect them with heat shrink.
- The Walksnail antenna goes in the rear TPU mount, angled 45° up.

## Tune

Betaflight 4.5 with the stock 5" preset, then:

1. Enable RPM filtering (bidirectional DShot 600).
2. Raise the dynamic idle to 35%.
3. Fly a battery, check the blackbox, done.

> Tip: set the ExpressLRS packet rate to 250Hz for freestyle; it gives the best mix of range and latency.

## Verdict

About 450 g dry, 5–6 minute flights on 6S 1100mAh, and it survived a season of bashing with only two arm swaps.`

function placeholderPhoto(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1066">
    <defs><pattern id="g" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M80 0H0V80" fill="none" stroke="hsl(${hue},90%,55%)" stroke-opacity=".18" stroke-width="2"/></pattern></defs>
    <rect width="100%" height="100%" fill="#0a0c0e"/><rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="800" cy="533" r="220" fill="none" stroke="hsl(${hue},90%,60%)" stroke-width="6"/>
    <path d="M560 533h480M800 293v480" stroke="hsl(${hue},90%,60%)" stroke-width="3" stroke-opacity=".6"/>
    <text x="800" y="900" font-family="monospace" font-size="56" fill="#e8ece6" text-anchor="middle">${label}</text>
    <text x="80" y="110" font-family="monospace" font-size="40" fill="#ff4d4d">● REC</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()
}

export async function seedExampleBuild(payload: Payload) {
  const existing = await payload.count({ collection: 'builds', where: { slug: { equals: SLUG } } })
  if (existing.totalDocs > 0) return

  const retailers = await Promise.all(RETAILERS.map((data) => payload.create({ collection: 'retailers', data })))

  const parts = []
  for (const { shops, ...data } of PARTS) {
    const part = await payload.create({ collection: 'parts', data })
    for (const i of shops) {
      await payload.create({
        collection: 'affiliate-links',
        data: { part: part.id, retailer: retailers[i].id, url: `${RETAILERS[i].url}/?product=${part.id}&ref=fpvnews`, active: true },
      })
    }
    parts.push(part)
  }

  const photos = []
  for (const [label, hue] of [['Example build · front', 80], ['Example build · electronics', 190], ['Example build · in flight', 330]] as const) {
    const data = await placeholderPhoto(label, hue)
    photos.push(
      await payload.create({
        collection: 'media',
        data: { alt: label },
        file: { data, mimetype: 'image/jpeg', name: `${label.replace(/\W+/g, '-').toLowerCase()}.jpg`, size: data.length },
      }),
    )
  }

  const content = convertMarkdownToLexical({
    editorConfig: await editorConfigFactory.default({ config: payload.config }),
    markdown: MARKDOWN,
  })

  await payload.create({
    collection: 'builds',
    context: { skipNotifications: true },
    data: {
      title: 'Budget 5" freestyle quad that survives anything',
      slug: SLUG,
      status: 'published',
      // No user account: creating one would take the "first user becomes admin" slot on a fresh install.
      authorName: 'FPV News',
      excerpt: 'A tough, cheap-to-repair 5" freestyle build with Walksnail HD and ExpressLRS that flies great on the stock tune.',
      difficulty: 'intermediate',
      frameSize: '5"',
      tags: ['freestyle', 'digital', 'budget'],
      photos: photos.map((p) => p.id),
      content,
      parts: [
        ...parts.map((part, i) => ({ part: part.id, quantity: i === 1 ? 4 : i === 5 ? 3 : 1, note: i === 5 ? 'Three sets; they are consumables.' : undefined })),
        { freeText: '6S 1100mAh LiPo', quantity: 4 },
        { freeText: 'M3 hardware, zip ties, heat shrink', quantity: 1 },
      ],
    },
  })
  payload.logger.info('Seeded example build')
}
