import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import React from 'react'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import './styles.css'
import { SITE_URL } from '@/lib/site'

const siteUrl = SITE_URL

// Render at request time: pages read the database and the runtime SERVER_URL.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'FPV News', template: '%s · FPV News' },
  description: 'FPV drone news, community builds and a weekly digest.',
  openGraph: { siteName: 'FPV News', type: 'website' },
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Analytics />
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
            <Link href="/" className="font-mono text-lg font-bold tracking-tight">
              <span className="text-accent">●</span> FPV<span className="text-accent">NEWS</span>
            </Link>
            <div className="ml-auto flex items-center gap-5 text-sm">
              <Link href="/" className="hover:text-accent">News</Link>
              <Link href="/builds" className="hover:text-accent">Builds</Link>
              <Link
                href="/submit"
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-fg hover:opacity-90"
              >
                Submit a build
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <div className="mx-auto max-w-6xl px-4">
          <NewsletterSignup />
        </div>
        <footer className="mt-16 border-t border-border">
          <div className="osd mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-6 text-muted">
            <span>© {new Date().getFullYear()} FPV News</span>
            <span>Links to original sources · we never republish articles</span>
            <Link href="/privacy" className="ml-auto hover:text-accent">Privacy</Link>
            <Link href="/admin" className="hover:text-accent">Log in</Link>
          </div>
        </footer>
      </body>
    </html>
  )
}

// Privacy-friendly visitor stats (no cookies): Plausible or Umami, switched on by environment variables.
function Analytics() {
  if (process.env.PLAUSIBLE_DOMAIN) {
    return (
      <Script
        defer
        data-domain={process.env.PLAUSIBLE_DOMAIN}
        src={process.env.PLAUSIBLE_SCRIPT_URL || 'https://plausible.io/js/script.outbound-links.js'}
        strategy="afterInteractive"
      />
    )
  }
  if (process.env.UMAMI_WEBSITE_ID) {
    return (
      <Script
        defer
        data-website-id={process.env.UMAMI_WEBSITE_ID}
        src={process.env.UMAMI_SCRIPT_URL || 'https://cloud.umami.is/script.js'}
        strategy="afterInteractive"
      />
    )
  }
  return null
}
