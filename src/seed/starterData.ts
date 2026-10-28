import type { Payload } from 'payload'
import { seedExampleBuild } from './exampleBuild'
import { seedMarketplaces } from './marketplaces'
import { seedSources } from './sources'

// Runs on every boot. On an empty database (e.g. a fresh Railway deploy) it loads the starter news
// sources and example build; marketplaces that aren't in the Marketplaces list yet are always added.
// Set SEED_ON_EMPTY=false to skip all of it.
export async function seedStarterData(payload: Payload) {
  if (process.env.SEED_ON_EMPTY === 'false') return
  const [sources, builds] = await Promise.all([
    payload.count({ collection: 'sources' }),
    payload.count({ collection: 'builds' }),
  ])
  if (sources.totalDocs === 0) await seedSources(payload)
  if (builds.totalDocs === 0) await seedExampleBuild(payload)
  await seedMarketplaces(payload)
}
