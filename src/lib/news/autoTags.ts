import type { Source } from '@/payload-types'

type Tag = NonNullable<Source['defaultTags']>[number]

const RULES: [Tag, RegExp][] = [
  ['firmware', /\b(firmware|betaflight|inav|expresslrs|elrs|edgetx|ardupilot|blheli|bluejay|am32|release candidate|\d+\.\d+\.\d+)\b/i],
  ['new-gear', /\b(announc\w*|launch\w*|unveil\w*|pre-?order|first look|unboxing|now available|introducing)\b/i],
  ['tutorial', /\b(how to|tutorial|guide|explained|beginner'?s?|step by step|tips)\b/i],
  ['regulation', /\b(easa|faa|caa|regulation\w*|law|laws|remote id|class c[0-6]|drone rules|registration|ban|bans|banned)\b/i],
  ['review', /\b(review\w*|tested|vs\.?|comparison)\b/i],
]

// Tags from the source defaults, the source type and keyword rules on the title/description.
export function autoTags(sourceType: Source['type'], defaults: Tag[], title: string, description = ''): Tag[] {
  const tags = new Set<Tag>(defaults)
  if (sourceType === 'github') tags.add('firmware')
  if (sourceType === 'youtube') tags.add('video')
  const text = `${title} ${description.slice(0, 500)}`
  for (const [tag, pattern] of RULES) if (pattern.test(text)) tags.add(tag)
  return [...tags]
}
