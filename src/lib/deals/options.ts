// Marketplaces the deals radar knows about. "other" = every site in the admin's Marketplaces list
// (searched with the generic structured-data adapter).
export const DEAL_SOURCES = [
  { label: 'eBay', value: 'ebay' },
  { label: 'Marktplaats (NL) / 2dehands (BE)', value: 'marktplaats' },
  { label: 'Kleinanzeigen (DE)', value: 'kleinanzeigen' },
  { label: 'willhaben (AT)', value: 'willhaben' },
  { label: 'OLX (PL, PT, RO, BG)', value: 'olx' },
  { label: 'Bazoš (CZ, SK)', value: 'bazos' },
  { label: 'Subito (IT)', value: 'subito' },
  { label: 'Wallapop (ES)', value: 'wallapop' },
  { label: 'Milanuncios (ES)', value: 'milanuncios' },
  { label: 'leboncoin (FR)', value: 'leboncoin' },
  { label: 'Vinted', value: 'vinted' },
  { label: 'Other marketplaces (Deals → Marketplaces)', value: 'other' },
]

export type DealSource =
  | 'ebay'
  | 'marktplaats'
  | 'kleinanzeigen'
  | 'willhaben'
  | 'olx'
  | 'bazos'
  | 'subito'
  | 'wallapop'
  | 'milanuncios'
  | 'leboncoin'
  | 'vinted'
  | 'other'

// EU member states plus the UK (eBay UK, Vinted UK).
export const COUNTRIES = [
  'NL', 'BE', 'LU', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'IE', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR',
  'RO', 'BG', 'GR', 'CY', 'MT', 'DK', 'SE', 'FI', 'EE', 'LV', 'LT', 'GB',
].map((c) => ({ label: c, value: c }))
