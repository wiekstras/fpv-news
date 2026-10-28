import { claude, claudeConfigured, CLAUDE_MODEL, fallbackParams } from '../claude'
import type { DigestContent } from './render'

const SYSTEM = `You write the opening paragraph of a weekly FPV drone newsletter.
Write 2-3 friendly, plain sentences (max 450 characters) that highlight what stood out this week, based only on the items given.
No greeting line, no sign-off, no hype words, no emoji, no markdown. Don't invent facts beyond the titles and summaries.`

// A short intro for the digest, or null when Claude isn't configured or declines.
export async function writeDigestIntro(content: Pick<DigestContent, 'featured' | 'entries'>): Promise<string | null> {
  if (!claudeConfigured() || (content.entries.length === 0 && !content.featured)) return null
  const lines = [
    ...(content.featured ? [`Featured build: ${content.featured.title}${content.featured.text ? ` – ${content.featured.text}` : ''}`] : []),
    ...content.entries.map((e) => `${e.kind === 'news' ? `News (${e.source})` : 'Build'}: ${e.title}${e.text ? ` – ${e.text}` : ''}`),
  ]
  const response = await claude().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    output_config: { effort: 'low' },
    ...fallbackParams(),
    messages: [{ role: 'user', content: `This week's items:\n${lines.join('\n')}` }],
  })
  if (response.stop_reason === 'refusal') return null
  const text = response.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim()
  return text ? text.slice(0, 800) : null
}
