export type DigestEntry =
  | { kind: 'news'; title: string; url: string; text?: string | null; source: string }
  | { kind: 'build'; title: string; url: string; text?: string | null; image?: string | null; meta: string }

export type DigestContent = {
  subject: string
  intro?: string | null
  featured?: { title: string; url: string; text?: string | null; image?: string | null; meta: string } | null
  entries: DigestEntry[]
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const paragraphs = (s: string) =>
  s
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

// Email-safe HTML (tables + inline styles) and a plain-text version.
export function renderDigest(content: DigestContent, opts: { siteUrl: string; siteName: string; unsubscribeUrl: string }) {
  const news = content.entries.filter((e) => e.kind === 'news')
  const builds = content.entries.filter((e) => e.kind === 'build')
  const link = (url: string, text: string) => `<a href="${esc(url)}" style="color:#3f7d00;text-decoration:none;font-weight:600">${esc(text)}</a>`

  const section = (title: string, rows: string[]) =>
    rows.length
      ? `<tr><td style="padding:24px 0 8px;font:600 12px/1.4 monospace;letter-spacing:.08em;text-transform:uppercase;color:#5b6157">${title}</td></tr>${rows.join('')}`
      : ''

  const row = (e: DigestEntry) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e3e6df">
      ${e.kind === 'build' && e.image ? `<img src="${esc(e.image)}" alt="" width="560" style="display:block;width:100%;max-width:560px;border-radius:6px;margin-bottom:8px">` : ''}
      <div style="font:600 11px/1.4 monospace;color:#007f99;text-transform:uppercase">${esc(e.kind === 'news' ? e.source : e.meta)}</div>
      <div style="font:600 17px/1.35 sans-serif;margin:2px 0 4px">${link(e.url, e.title)}</div>
      ${e.text ? `<div style="font:14px/1.5 sans-serif;color:#3a3f37">${esc(e.text)}</div>` : ''}
    </td></tr>`

  const featured = content.featured
    ? `<tr><td style="padding:16px;background:#12161a;border-radius:8px;color:#e8ece6">
        ${content.featured.image ? `<img src="${esc(content.featured.image)}" alt="" width="528" style="display:block;width:100%;border-radius:6px;margin-bottom:12px">` : ''}
        <div style="font:600 11px/1.4 monospace;color:#b6ff3b;text-transform:uppercase">Featured build · ${esc(content.featured.meta)}</div>
        <div style="font:700 20px/1.3 sans-serif;margin:4px 0 6px"><a href="${esc(content.featured.url)}" style="color:#e8ece6;text-decoration:none">${esc(content.featured.title)}</a></div>
        ${content.featured.text ? `<div style="font:14px/1.5 sans-serif;color:#b9c0b6">${esc(content.featured.text)}</div>` : ''}
      </td></tr>`
    : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(content.subject)}</title></head>
<body style="margin:0;background:#f6f7f4;color:#12150f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="font:700 18px/1 monospace;padding-bottom:16px"><span style="color:#3f7d00">●</span> ${esc(opts.siteName)}</td></tr>
  ${content.intro ? `<tr><td style="font:15px/1.6 sans-serif;padding-bottom:16px">${paragraphs(content.intro)}</td></tr>` : ''}
  ${featured}
  ${section('This week in FPV', news.map(row))}
  ${section('Fresh community builds', builds.map(row))}
  <tr><td style="padding:24px 0;font:12px/1.6 sans-serif;color:#5b6157">
    You get this because you subscribed at ${link(opts.siteUrl, opts.siteUrl.replace(/^https?:\/\//, ''))}.
    <a href="${esc(opts.unsubscribeUrl)}" style="color:#5b6157">Unsubscribe in one click</a>.
  </td></tr>
</table></td></tr></table></body></html>`

  const textEntry = (e: DigestEntry) => `- ${e.title}\n  ${e.url}${e.text ? `\n  ${e.text}` : ''}`
  const text = [
    opts.siteName,
    content.intro ?? '',
    content.featured ? `FEATURED BUILD: ${content.featured.title}\n${content.featured.url}` : '',
    news.length ? `THIS WEEK IN FPV\n${news.map(textEntry).join('\n')}` : '',
    builds.length ? `FRESH COMMUNITY BUILDS\n${builds.map(textEntry).join('\n')}` : '',
    `Unsubscribe: ${opts.unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return { html, text }
}
