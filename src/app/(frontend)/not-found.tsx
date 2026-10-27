import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="py-24 text-center">
      <p className="osd text-signal">SIGNAL LOST</p>
      <h1 className="mt-2 text-4xl font-bold">404 – Nothing here</h1>
      <p className="mt-3 text-muted">This page crashed into a tree. Let&apos;s get you back to the feed.</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-accent px-4 py-2 font-medium text-accent-fg">
        Back to news
      </Link>
    </section>
  )
}
