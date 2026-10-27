import { describe, expect, it } from 'vitest'
import { slugify } from '@/lib/slugify'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('My 5" Freestyle Build!')).toBe('my-5-freestyle-build')
  })

  it('strips accents', () => {
    expect(slugify('Über Quad à Paris')).toBe('uber-quad-a-paris')
  })

  it('caps length at 80 characters', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(80)
  })
})
