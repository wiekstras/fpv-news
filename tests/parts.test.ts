import { describe, expect, it } from 'vitest'
import { catalogPartIds, hasAffiliateLinks, resolveParts } from '@/lib/builds/parts'
import type { AffiliateLink, Build, Part, Retailer } from '@/payload-types'

const part = (id: number, name: string, brand?: string) => ({ id, name, brand, category: 'motors' }) as Part
const shop = (id: number, name: string) => ({ id, name }) as Retailer
const link = (id: number, p: Part | number, r: Retailer, url: string, active = true) =>
  ({ id, part: p, retailer: r, url, active }) as AffiliateLink

const motors = part(1, 'F60 Pro V', 'T-Motor')
const frame = part(2, 'Source One V5')
const parts: Build['parts'] = [
  { part: motors, quantity: 4, note: '1950KV' },
  { part: frame, quantity: 1 },
  { freeText: 'Zip ties', quantity: 10 },
]

describe('resolveParts', () => {
  it('attaches only active links of the matching catalog part', () => {
    const shopA = shop(1, 'Shop A')
    const shopB = shop(2, 'Shop B')
    const rows = resolveParts(parts, [
      link(1, motors, shopA, 'https://a.example/motors?ref=fpv'),
      link(2, 1, shopB, 'https://b.example/motors?ref=fpv'),
      link(3, frame, shopA, 'https://a.example/frame', false),
    ])
    expect(rows[0]).toEqual({
      name: 'T-Motor F60 Pro V',
      category: 'motors',
      quantity: 4,
      note: '1950KV',
      links: [
        { retailer: 'Shop A', url: 'https://a.example/motors?ref=fpv' },
        { retailer: 'Shop B', url: 'https://b.example/motors?ref=fpv' },
      ],
    })
    expect(rows[1].links).toEqual([])
    expect(rows[2]).toMatchObject({ name: 'Zip ties', quantity: 10, links: [] })
    expect(hasAffiliateLinks(rows)).toBe(true)
  })

  it('reports no affiliate links when none are active', () => {
    const rows = resolveParts(parts, [link(1, frame, shop(1, 'Shop A'), 'https://a.example', false)])
    expect(hasAffiliateLinks(rows)).toBe(false)
  })

  it('handles an empty parts list', () => {
    expect(resolveParts(undefined, [])).toEqual([])
  })
})

describe('catalogPartIds', () => {
  it('collects ids from populated and unpopulated relations, skipping free text', () => {
    expect(catalogPartIds([{ part: motors }, { part: 7 }, { freeText: 'x' }])).toEqual([1, 7])
  })
})
