// Marketplaces the deals radar knows about. Only some have adapters; see src/lib/deals/adapters.
export const DEAL_SOURCES = [
  { label: 'eBay', value: 'ebay' },
  { label: 'Marktplaats (NL) / 2dehands (BE)', value: 'marktplaats' },
  { label: 'Kleinanzeigen (DE)', value: 'kleinanzeigen' },
  { label: 'Subito (IT)', value: 'subito' },
  { label: 'Wallapop (ES)', value: 'wallapop' },
  { label: 'Milanuncios (ES)', value: 'milanuncios' },
  { label: 'leboncoin (FR)', value: 'leboncoin' },
  { label: 'Vinted', value: 'vinted' },
]

export type DealSource = 'ebay' | 'marktplaats' | 'kleinanzeigen' | 'subito' | 'wallapop' | 'milanuncios' | 'leboncoin' | 'vinted'

export const COUNTRIES = ['NL', 'BE', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'PL', 'CZ', 'DK', 'SE', 'IE', 'GB'].map(
  (c) => ({ label: c, value: c }),
)
