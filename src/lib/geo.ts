import type { Payload } from 'payload'
import { SITE_URL } from './site'

// Great-circle distance in km.
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)))
}

// OpenStreetMap Nominatim (usage policy: max 1 request/second, identify the app). Results are
// cached in the geo-cache collection, so every place is looked up only once. GEOCODER_URL can
// point at a self-hosted Nominatim.
const GEOCODER = process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search'
let nextSlot = 0

export async function geocode(payload: Payload, place: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const key = `${country}|${place.trim().toLowerCase().replace(/\s+/g, ' ')}`
  const { docs } = await payload.find({ collection: 'geo-cache', where: { key: { equals: key } }, limit: 1, depth: 0 })
  if (docs[0]) return docs[0].lat != null && docs[0].lon != null ? { lat: docs[0].lat, lon: docs[0].lon } : null

  const wait = nextSlot - Date.now()
  nextSlot = Math.max(Date.now(), nextSlot) + 1100
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))

  const params = new URLSearchParams({ q: place, countrycodes: country.toLowerCase(), format: 'json', limit: '1' })
  const res = await fetch(`${GEOCODER}?${params}`, {
    headers: { 'user-agent': `FPVNewsDealsBot/1.0 (+${SITE_URL})`, 'accept-language': 'en' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Geocoder answered ${res.status}`)
  const [hit] = (await res.json()) as { lat: string; lon: string }[]
  const point = hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null
  await payload.create({ collection: 'geo-cache', data: { key, lat: point?.lat ?? null, lon: point?.lon ?? null } })
  return point
}
