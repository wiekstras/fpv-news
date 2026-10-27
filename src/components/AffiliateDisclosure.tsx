// Shown on every page that contains affiliate links.
export function AffiliateDisclosure() {
  return (
    <aside role="note" className="rounded-md border border-accent/60 bg-surface px-4 py-3 text-sm">
      <span className="osd mr-2 text-accent">Affiliate disclosure</span>
      Some links on this page are affiliate links. If you buy through them we may earn a small commission, at no extra
      cost to you. It never influences which parts builders choose.
    </aside>
  )
}
