import Anthropic from '@anthropic-ai/sdk'

// Shared Claude client for news summaries and digest intros (needs ANTHROPIC_API_KEY).
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'

let client: Anthropic | undefined
export const claude = () => (client ??= new Anthropic())
export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY)

// Server-side fallback when the model declines a request (not available for Haiku).
export const fallbackParams = () =>
  CLAUDE_MODEL.startsWith('claude-haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
