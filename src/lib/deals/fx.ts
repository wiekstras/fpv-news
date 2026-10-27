// ECB euro reference rates: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
// Each rate is "units of currency per 1 EUR".
export function parseEcbRates(xml: string): { date: string; rates: Record<string, number> } {
  const date = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1] ?? ''
  const rates: Record<string, number> = { EUR: 1 }
  for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    rates[m[1]] = Number(m[2])
  }
  return { date, rates }
}

export function toEur(price: number | null, currency: string, rates: Record<string, number>): number | null {
  if (price === null) return null
  const rate = currency === 'EUR' ? 1 : rates[currency]
  return rate ? Math.round((price / rate) * 100) / 100 : null
}
