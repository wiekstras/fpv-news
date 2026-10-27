import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, Where } from 'payload'
import { COUNTRIES, DEAL_SOURCES } from '@/lib/deals/options'
import { DealActions, RunDealsButton } from './DealsClient'

const SESSION_GAP_MS = 30 * 60 * 1000

const money = (value: number | null | undefined, currency = 'EUR') =>
  value == null ? '–' : new Intl.NumberFormat('en-IE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)

const when = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }).format(new Date(iso))
    : '–'

// Admin-only deals dashboard at /admin/deals.
export async function DealsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, visibleEntities, permissions, locale } = initPageResult
  const user = req.user
  if (!user) redirect('/admin/login')
  if (user.role !== 'admin') redirect('/admin')
  const sp = (searchParams ?? {}) as Record<string, string | undefined>

  // "New since last visit": a visit starts after 30 minutes of not opening the dashboard.
  let seenBefore = user.dealsSeenBefore ?? null
  const last = user.lastDealsVisitAt ? new Date(user.lastDealsVisitAt).getTime() : 0
  if (Date.now() - last > SESSION_GAP_MS) {
    seenBefore = user.lastDealsVisitAt ?? null
    await req.payload.update({
      collection: 'users',
      id: user.id,
      data: { dealsSeenBefore: seenBefore, lastDealsVisitAt: new Date().toISOString() },
      overrideAccess: true,
    })
  }

  const where: Where = {}
  const state = sp.state ?? 'open'
  where.state = state === 'open' ? { in: ['new', 'interesting'] } : state === 'all' ? { exists: true } : { equals: state }
  if (sp.source) where.source = { equals: sp.source }
  if (sp.country) where.country = { equals: sp.country }
  if (sp.q) where.title = { like: sp.q }
  if (sp.min || sp.max) {
    where.priceEur = {
      ...(sp.min ? { greater_than_equal: Number(sp.min) } : {}),
      ...(sp.max ? { less_than_equal: Number(sp.max) } : {}),
    }
  }

  const [listings, searches] = await Promise.all([
    req.payload.find({
      collection: 'listings',
      where,
      sort: sp.sort === 'price' ? 'priceEur' : '-firstSeenAt',
      limit: 50,
      page: Number(sp.page) || 1,
      depth: 1,
      overrideAccess: false,
      user,
    }),
    req.payload.find({ collection: 'saved-searches', pagination: false, depth: 0, sort: 'name' }),
  ])
  const newCount = seenBefore
    ? listings.docs.filter((l) => l.firstSeenAt > seenBefore!).length
    : listings.docs.length

  const pageLink = (page: number) => `?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(page) })}`

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <div className="deals">
        <header className="deals__header">
          <div>
            <h1>Deals radar</h1>
            <p className="deals__muted">
              {listings.totalDocs} listings · <strong>{newCount}</strong> new since your last visit
              {seenBefore ? ` (${when(seenBefore)})` : ''}
            </p>
          </div>
          <RunDealsButton />
        </header>

        <section className="deals__searches">
          {searches.docs.length === 0 && (
            <p>
              No saved searches yet. <a href="/admin/collections/saved-searches/create">Create one</a>, then press “Run searches now”.
            </p>
          )}
          {searches.docs.map((s) => (
            <a key={s.id} href={`/admin/collections/saved-searches/${s.id}`} className="deals__search">
              <strong>{s.name}</strong> {s.active ? '' : '(paused)'}
              <span className="deals__muted"> · last run {when(s.lastRunAt)}</span>
              {s.lastResult && <pre>{s.lastResult}</pre>}
            </a>
          ))}
        </section>

        <form className="deals__filters" method="get">
          <input name="q" placeholder="Keyword in title" defaultValue={sp.q} />
          <select name="source" defaultValue={sp.source ?? ''}>
            <option value="">All sources</option>
            {DEAL_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select name="country" defaultValue={sp.country ?? ''}>
            <option value="">All countries</option>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input name="min" type="number" placeholder="Min €" defaultValue={sp.min} />
          <input name="max" type="number" placeholder="Max €" defaultValue={sp.max} />
          <select name="state" defaultValue={state}>
            <option value="open">New + interesting</option>
            <option value="new">New</option>
            <option value="interesting">Interesting</option>
            <option value="ignored">Ignored</option>
            <option value="all">All</option>
          </select>
          <select name="sort" defaultValue={sp.sort ?? ''}>
            <option value="">Newest first</option>
            <option value="price">Cheapest first</option>
          </select>
          <button type="submit">Filter</button>
          <a href="/admin/deals">Reset</a>
        </form>

        <table className="deals__table">
          <thead>
            <tr>
              <th />
              <th>Listing</th>
              <th>Price</th>
              <th>Where</th>
              <th>Posted / seen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {listings.docs.map((l) => {
              const isNew = !seenBefore || l.firstSeenAt > seenBefore
              return (
                <tr key={l.id} className={`${isNew ? 'is-new' : ''} is-${l.state}`}>
                  <td>{l.image ? <img src={l.image} alt="" referrerPolicy="no-referrer" loading="lazy" /> : null}</td>
                  <td>
                    {isNew && <span className="deals__badge">NEW</span>}
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
                    <div className="deals__muted">
                      {DEAL_SOURCES.find((s) => s.value === l.source)?.label ?? l.source}
                      {typeof l.savedSearch === 'object' && l.savedSearch ? ` · ${l.savedSearch.name}` : ''}
                    </div>
                  </td>
                  <td>
                    <strong>{money(l.priceEur)}</strong>
                    {l.currency && l.currency !== 'EUR' && l.price != null && <div className="deals__muted">{money(l.price, l.currency)}</div>}
                  </td>
                  <td>
                    {l.country}
                    {l.location && <div className="deals__muted">{l.location}</div>}
                  </td>
                  <td>
                    {when(l.postedAt)}
                    <div className="deals__muted">seen {when(l.firstSeenAt)}</div>
                  </td>
                  <td><DealActions id={l.id} state={l.state} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {listings.docs.length === 0 && <p className="deals__muted">No listings match these filters.</p>}

        {listings.totalPages > 1 && (
          <nav className="deals__pages">
            {listings.hasPrevPage && <a href={pageLink(listings.prevPage!)}>← Previous</a>}
            <span>Page {listings.page} / {listings.totalPages}</span>
            {listings.hasNextPage && <a href={pageLink(listings.nextPage!)}>Next →</a>}
          </nav>
        )}
      </div>
    </DefaultTemplate>
  )
}
