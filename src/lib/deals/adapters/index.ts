import type { DealSource } from '../options'
import type { Adapter } from '../types'
import { bazos } from './bazos'
import { ebay } from './ebay'
import { kleinanzeigen } from './kleinanzeigen'
import { leboncoin } from './leboncoin'
import { marktplaats } from './marktplaats'
import { olx } from './olx'
import { subito } from './subito'
import { vinted } from './vinted'
import { wallapop } from './wallapop'
import { willhaben } from './willhaben'

// Sources with a dedicated adapter. ebay/marktplaats/kleinanzeigen/willhaben/olx/bazos use plain HTTP;
// leboncoin/subito/vinted/wallapop use the headless browser (src/lib/deals/browser.ts).
// "other" (the Marketplaces list) goes through generic.ts instead.
export const ADAPTERS: Partial<Record<DealSource, Adapter>> = {
  ebay,
  marktplaats,
  kleinanzeigen,
  willhaben,
  olx,
  bazos,
  subito,
  wallapop,
  leboncoin,
  vinted,
}
