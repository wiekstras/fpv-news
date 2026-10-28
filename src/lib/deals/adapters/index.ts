import type { DealSource } from '../options'
import type { Adapter } from '../types'
import { ebay } from './ebay'
import { kleinanzeigen } from './kleinanzeigen'
import { leboncoin } from './leboncoin'
import { marktplaats } from './marktplaats'
import { subito } from './subito'
import { vinted } from './vinted'
import { wallapop } from './wallapop'

// Sources with a working adapter. ebay/marktplaats/kleinanzeigen use plain HTTP;
// leboncoin/subito/vinted/wallapop use the headless browser (src/lib/deals/browser.ts).
export const ADAPTERS: Partial<Record<DealSource, Adapter>> = {
  ebay,
  marktplaats,
  kleinanzeigen,
  subito,
  wallapop,
  leboncoin,
  vinted,
}
