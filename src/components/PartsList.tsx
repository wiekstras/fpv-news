import type { PartRow } from '@/lib/builds/parts'

export function PartsList({ rows }: { rows: PartRow[] }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
          <span className="osd w-10 text-muted">{row.quantity}×</span>
          <span className="min-w-0 flex-1">
            <span className="font-medium">{row.name}</span>
            {row.category && <span className="osd ml-2 text-muted">{row.category.replace('-', ' ')}</span>}
            {row.note && <span className="block text-sm text-muted">{row.note}</span>}
          </span>
          {row.links.length > 0 && (
            <span className="flex flex-wrap gap-2">
              {row.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  className="osd rounded border border-accent px-2 py-1 text-accent hover:bg-accent hover:text-accent-fg"
                >
                  {link.retailer} ↗
                </a>
              ))}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
