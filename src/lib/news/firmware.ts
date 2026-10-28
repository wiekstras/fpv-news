import type { FeedEntry } from './parseFeed'

const PRERELEASE = /(?:^|[\s\-._(])(rc\s?\d*|beta|alpha|pre-?release|nightly|preview|dev)(?:$|[\s\-._)\d])/i

export const isPrerelease = (title: string) => PRERELEASE.test(title)

// "Betaflight 4.6.0-RC2" → "4.6.0-RC2", "EdgeTX \"Ursa Minor\" v2.10.0" → "2.10.0"
export function extractVersion(title: string): string | null {
  const m = title.match(/v?(\d+\.\d+(?:\.\d+)*(?:[-.]?(?:rc|beta|alpha)[.\-]?\d*)?)/i)
  return m ? m[1] : null
}

export type Release = { version: string; url: string; date: Date }

// Latest stable release, plus the latest pre-release only when it is newer than that stable.
export function latestReleases(entries: FeedEntry[]): { stable: Release | null; pre: Release | null } {
  const releases = entries
    .map((e) => ({ version: extractVersion(e.title), url: e.url, date: e.publishedAt, pre: isPrerelease(e.title) }))
    .filter((r): r is Release & { pre: boolean } => r.version !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
  const stable = releases.find((r) => !r.pre) ?? null
  const pre = releases.find((r) => r.pre && (!stable || r.date > stable.date)) ?? null
  const strip = (r: (Release & { pre: boolean }) | null) => (r ? { version: r.version, url: r.url, date: r.date } : null)
  return { stable: strip(stable), pre: strip(pre) }
}
