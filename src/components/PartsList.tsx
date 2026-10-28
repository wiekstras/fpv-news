import { buildTotal, type PartRow } from '@/lib/builds/parts'

const eur = (v: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(v)
// Shop links go through /go/<id> so clicks are counted.
const goUrl = (linkId: number, buildId: number) => `/go/${linkId}?b=${buildId}`

export function PartsList({ rows, buildId }: { rows: PartRow[]; buildId: number }) {
  const { total, priced, count } = buildTotal(rows)
  const shopping = rows.filter((r) => r.links.length > 0)
  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((row, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
            <span className="osd w-10 text-muted">{row.quantity}×</span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{row.name}</span>
              {row.category && <span className="osd ml-2 text-muted">{row.category.replace('-', ' ')}</span>}
              {row.note && <span className="block text-sm text-muted">{row.note}</span>}
            </span>
            {row.unitPrice != null && (
              <span className="osd text-muted">
                {row.quantity > 1 ? `${row.quantity} × ${eur(row.unitPrice)}` : eur(row.unitPrice)}
              </span>
            )}
            {row.links.length > 0 && (
              <span className="flex flex-wrap gap-2">
                {row.links.map((link) => (
                  <a
                    key={link.id}
                    href={goUrl(link.id, buildId)}
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    className="osd rounded border border-accent px-2 py-1 text-accent hover:bg-accent hover:text-accent-fg"
                  >
                    {link.retailer}
                    {link.price != null ? ` ${eur(link.price)}` : ''} ↗
                  </a>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      {priced > 0 && (
        <p className="mt-3 text-right">
          <span className="osd text-muted">Estimated total</span>{' '}
          <strong className="text-lg">≈ {eur(total)}</strong>
          {priced < count && <span className="block text-sm text-muted">{count - priced} of {count} parts have no known price</span>}
        </p>
      )}
      {shopping.length > 1 && (
        <section className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h3 className="font-semibold">Shopping list: rebuild this quad</h3>
          <p className="text-sm text-muted">The cheapest known shop for each part.</p>
          <ol className="mt-3 space-y-1 text-sm">
            {shopping.map((row, i) => (
              <li key={i}>
                {row.quantity}× {row.name}:{' '}
                <a href={goUrl(row.links[0].id, buildId)} target="_blank" rel="sponsored nofollow noopener" className="text-accent underline">
                  {row.links[0].retailer}
                  {row.links[0].price != null ? ` (${eur(row.links[0].price)})` : ''}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  )
}
