import { describe, expect, it } from 'vitest'
import { rateLimit } from '@/lib/rateLimit'

describe('rateLimit', () => {
  it('allows up to the limit within a window, then blocks', () => {
    const key = `test:${Math.random()}`
    expect([1, 2, 3].map(() => rateLimit(key, 2, 60_000))).toEqual([true, true, false])
  })
})
