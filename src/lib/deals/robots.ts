// Minimal robots.txt support: picks the group for our user agent (or *) and applies
// the longest matching Allow/Disallow rule, with * and $ wildcards.
type Rule = { allow: boolean; pattern: string }

export function parseRobots(txt: string, userAgent: string): Rule[] {
  const ua = userAgent.toLowerCase()
  const groups: { agents: string[]; rules: Rule[] }[] = []
  let current: { agents: string[]; rules: Rule[] } | null = null
  let lastWasAgent = false

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }))
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      if (current && (key === 'allow' || key === 'disallow') && (value || key === 'allow')) {
        current.rules.push({ allow: key === 'allow', pattern: value })
      }
    }
  }

  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && ua.includes(a)))
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'))
  return chosen.flatMap((g) => g.rules)
}

function toRegex(pattern: string) {
  const anchored = pattern.endsWith('$')
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

export function isAllowed(rules: Rule[], pathAndQuery: string): boolean {
  let best: Rule | null = null
  for (const rule of rules) {
    if (!rule.pattern || !toRegex(rule.pattern).test(pathAndQuery)) continue
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) {
      best = rule
    }
  }
  return best ? best.allow : true
}
