import type { Payload } from 'payload'
import { seedExampleBuild } from './exampleBuild'
import { seedSources } from './sources'

// First boot on an empty database (e.g. a fresh Railway deploy): load the starter news sources
// and the example build. Set SEED_ON_EMPTY=false to skip.
export async function seedIfEmpty(payload: Payload) {
  if (process.env.SEED_ON_EMPTY === 'false') return
  const [sources, builds] = await Promise.all([
    payload.count({ collection: 'sources' }),
    payload.count({ collection: 'builds' }),
  ])
  if (sources.totalDocs === 0) await seedSources(payload)
  if (builds.totalDocs === 0) await seedExampleBuild(payload)
}
