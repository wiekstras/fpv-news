import type { DealSource } from '../options'
import type { Adapter } from '../types'
import { ebay } from './ebay'
import { kleinanzeigen } from './kleinanzeigen'
import { marktplaats } from './marktplaats'

// Sources with a working adapter. The others in DEAL_SOURCES are documented in the README.
export const ADAPTERS: Partial<Record<DealSource, Adapter>> = { ebay, marktplaats, kleinanzeigen }
