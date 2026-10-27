// Marketplaces the deals radar knows about. Adapters are added one by one in Phase 5.
export const DEAL_SOURCES = [
  { label: 'eBay', value: 'ebay' },
  { label: 'Marktplaats (NL)', value: 'marktplaats' },
  { label: 'Kleinanzeigen (DE)', value: 'kleinanzeigen' },
  { label: 'Subito (IT)', value: 'subito' },
  { label: 'Wallapop (ES)', value: 'wallapop' },
  { label: 'Milanuncios (ES)', value: 'milanuncios' },
  { label: 'leboncoin (FR)', value: 'leboncoin' },
  { label: 'Vinted', value: 'vinted' },
]

export const COUNTRIES = ['NL', 'BE', 'DE', 'AT', 'FR', 'IT', 'ES', 'PT', 'PL', 'CZ', 'DK', 'SE', 'IE', 'GB'].map(
  (c) => ({ label: c, value: c }),
)
