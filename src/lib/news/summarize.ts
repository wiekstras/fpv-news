import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { NEWS_TAGS } from '../tags'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'

const SummarySchema = z.object({
  summary: z.string(),
  tags: z.array(z.enum(NEWS_TAGS.map((t) => t.value) as [string, ...string[]])),
})

export type Summary = z.infer<typeof SummarySchema>

const SYSTEM = `You write short news blurbs for an FPV drone news site that links to original articles.
Write the summary in your own words: 1-2 plain sentences, max 280 characters, no quotes from the source, no hype, no emoji.
Say what is new and why an FPV pilot might care. If the excerpt is too thin to say anything beyond the title, describe what the link is about.
Pick 0-3 tags that clearly apply: firmware (FC/radio/VTX firmware releases), new-gear (product launches/announcements), video, tutorial, regulation (rules, laws, registration), review, community (events, races, people).`

let client: Anthropic | undefined

// Returns null when no API key is configured or the model declines.
export async function summarize(input: { title: string; sourceName: string; excerpt?: string }): Promise<Summary | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  client ??= new Anthropic()

  const withFallback = !MODEL.startsWith('claude-haiku')
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    output_config: { effort: 'low', format: betaZodOutputFormat(SummarySchema) },
    ...(withFallback && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
    messages: [
      {
        role: 'user',
        content: `Source: ${input.sourceName}\nTitle: ${input.title}\n\nExcerpt from the feed:\n${input.excerpt || '(none)'}`,
      },
    ],
  })

  if (response.stop_reason === 'refusal' || !response.parsed_output) return null
  return { ...response.parsed_output, summary: response.parsed_output.summary.trim().slice(0, 400) }
}
