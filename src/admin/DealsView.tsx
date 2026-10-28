import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, Where } from 'payload'
import { COUNTRIES, DEAL_SOURCES } from '@/lib/deals/options'
import { ADAPTERS } from '@/lib/deals/adapters'
import type { SourceHealth } from '@/payload-types'
import { DealActions, DealsSearch, ResumeSourceButton, RunDealsButton } from './DealsClient'

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
  if (sp.discount) where.discountPct = { greater_than_equal: Number(sp.discount) }
  if (sp.sort === 'discount') where.discountPct = { ...(where.discountPct as object), exists: true }
  if (sp.km) where.distanceKm = { less_than_equal: Number(sp.km) }
  if (sp.sort === 'distance') where.distanceKm = { ...(where.distanceKm as object), exists: true }
  // Same item on several sites: show it once (the first one found), unless asked for all.
  if (sp.dupes !== '1') where.duplicateOf = { exists: false }
  if (sp.gone !== '1') where.availability = { not_equals: 'gone' }
  if (sp.min || sp.max) {
    where.priceEur = {
      ...(sp.min ? { greater_than_equal: Number(sp.min) } : {}),
      ...(sp.max ? { less_than_equal: Number(sp.max) } : {}),
    }
  }

  const settings = await req.payload.findGlobal({ slug: 'settings', depth: 0 })
  const enabledSources: string[] = settings.enabledDealSources ?? []

  const [listings, searches] = await Promise.all([
    req.payload.find({
      collection: 'listings',
      where,
      sort:
        sp.sort === 'price' ? 'priceEur' : sp.sort === 'discount' ? '-discountPct' : sp.sort === 'distance' ? 'distanceKm' : '-firstSeenAt',
      limit: 50,
      page: Number(sp.page) || 1,
      depth: 1,
      overrideAccess: false,
      user,
    }),
    req.payload.find({ collection: 'saved-searches', pagination: false, depth: 0, sort: 'name' }),
  ])
  const [health, dupes] = await Promise.all([
    req.payload.find({ collection: 'source-health', pagination: false, depth: 0, sort: 'label' }),
    // Other sites that carry the same items as the listings on this page.
    req.payload.find({
      collection: 'listings',
      where: { duplicateOf: { in: listings.docs.map((l) => l.id) } },
      pagination: false,
      depth: 0,
      select: { duplicateOf: true, url: true, source: true, marketplace: true, priceEur: true },
    }),
  ])
  const alsoOn = (id: number) => dupes.docs.filter((d) => d.duplicateOf === id)
  const sourceName = (l: { source: string; marketplace?: string | null }) =>
    l.marketplace ?? DEAL_SOURCES.find((s) => s.value === l.source)?.label ?? l.source
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

        <DealsSearch
          sources={DEAL_SOURCES.filter((s) => (s.value in ADAPTERS || s.value === 'other') && enabledSources.includes(s.value))}
        />

        <SourceHealthTable rows={health.docs} />

        <h2>Saved searches</h2>
        <section className="deals__searches">
          {searches.docs.length === 0 && (
            <p>
              No saved searches yet. <a href="/admin/collections/saved-searches/create">Create one</a>, then press “Run searches now”.
            </p>
          )}
          {searches.docs.map((s) => (
            <a key={s.id} href={`/admin/collections/saved-searches/${s.id}`} className="deals__search">
              <strong>{s.name}</strong> {s.active ? '' : '(paused)'}
              <span className="deals__muted">
                {' '}· every {s.runEveryHours ?? 3}h · last run {when(s.lastRunAt)}
                {s.maxDistanceKm ? ` · within ${s.maxDistanceKm} km` : ''}
              </span>
              <div className="deals__muted">
                New price:{' '}
                {s.referencePrice
                  ? `${money(s.referencePrice)} (set by you)`
                  : s.marketPrice
                    ? `≈ ${money(s.marketPrice)} (eBay.de, ${s.marketPriceCount} new listings)`
                    : 'unknown (set it on the search, or add eBay keys)'}
              </div>
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
          <input name="discount" type="number" placeholder="Min % off" defaultValue={sp.discount} />
          <input name="km" type="number" placeholder="Max km" defaultValue={sp.km} />
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
            <option value="discount">Biggest discount</option>
            <option value="distance">Nearest first</option>
          </select>
          <label><input type="checkbox" name="dupes" value="1" defaultChecked={sp.dupes === '1'} /> show duplicates</label>
          <label><input type="checkbox" name="gone" value="1" defaultChecked={sp.gone === '1'} /> show sold/gone</label>
          <button type="submit">Filter</button>
          <a href="/admin/deals">Reset</a>
        </form>

        <table className="deals__table">
          <thead>
            <tr>
              <th />
              <th>Listing</th>
              <th>Price</th>
              <th>vs new</th>
              <th>Where</th>
              <th>Posted / seen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {listings.docs.map((l) => {
              const isNew = !seenBefore || l.firstSeenAt > seenBefore
              return (
                <tr key={l.id} className={`${isNew ? 'is-new' : ''} is-${l.state} ${l.availability === 'gone' ? 'is-gone' : ''}`}>
                  <td>{l.image ? <img src={l.image} alt="" referrerPolicy="no-referrer" loading="lazy" /> : null}</td>
                  <td>
                    {isNew && <span className="deals__badge">NEW</span>}
                    {l.availability === 'gone' && <span className="deals__badge is-gone">GONE</span>}
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
                    <div className="deals__muted">
                      {sourceName(l)}
                      {typeof l.savedSearch === 'object' && l.savedSearch ? ` · ${l.savedSearch.name}` : ''}
                      {l.sellerRating ? ` · seller ${l.sellerRating}` : ''}
                    </div>
                    {alsoOn(l.id).length > 0 && (
                      <div className="deals__muted">
                        Also on:{' '}
                        {alsoOn(l.id).map((d, i) => (
                          <span key={d.id}>
                            {i > 0 && ', '}
                            <a href={d.url} target="_blank" rel="noopener noreferrer">{sourceName(d)} {money(d.priceEur)}</a>
                          </span>
                        ))}
                      </div>
                    )}
                    {l.warning && <div className="deals__warning">⚠ {l.warning}</div>}
                  </td>
                  <td>
                    <strong>{money(l.priceEur)}</strong>
                    {Array.isArray(l.priceHistory) && l.priceHistory.length > 0 && (
                      <div className="deals__muted">
                        was {(l.priceHistory as { priceEur: number | null }[]).map((h) => money(h.priceEur)).join(' → ')}
                      </div>
                    )}
                    {l.currency && l.currency !== 'EUR' && l.price != null && <div className="deals__muted">{money(l.price, l.currency)}</div>}
                  </td>
                  <td>
                    {l.discountPct != null ? (
                      <span className={`deals__discount ${l.discountPct >= 30 ? 'is-great' : l.discountPct < 0 ? 'is-worse' : ''}`}>
                        {l.discountPct > 0 ? `−${l.discountPct}%` : `+${-l.discountPct}%`}
                      </span>
                    ) : (
                      '–'
                    )}
                    {l.referencePrice != null && <div className="deals__muted">new ≈ {money(l.referencePrice)}</div>}
                  </td>
                  <td>
                    {l.country}
                    {l.distanceKm != null && <strong> · {l.distanceKm} km</strong>}
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

// Per-source status: last success, failures in a row, and a resume button for paused sources.
function SourceHealthTable({ rows }: { rows: SourceHealth[] }) {
  if (rows.length === 0) return null
  const problems = rows.filter((r) => r.paused || (r.consecutiveFailures ?? 0) > 0)
  return (
    <details className="deals__health" open={problems.some((r) => r.paused)}>
      <summary>
        <strong>Source health</strong>{' '}
        <span className="deals__muted">
          {rows.length - problems.length} OK · {problems.filter((r) => !r.paused).length} failing · {rows.filter((r) => r.paused).length} paused
        </span>
      </summary>
      <table className="deals__table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Last success</th>
            <th>Found</th>
            <th>Failures in a row</th>
            <th>Last error</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.paused ? 'is-ignored' : ''}>
              <td>{r.label}</td>
              <td>{when(r.lastSuccessAt)}</td>
              <td>{r.lastFound ?? '–'}</td>
              <td>{r.consecutiveFailures ?? 0}</td>
              <td className="deals__muted">{r.lastError && (r.consecutiveFailures ?? 0) > 0 ? r.lastError : ''}</td>
              <td>{r.paused ? <ResumeSourceButton id={r.id} /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
