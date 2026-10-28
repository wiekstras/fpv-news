// Seeds starter data. Safe to run repeatedly: records that already exist are left alone.
// Run with: pnpm seed
import config from '@payload-config'
import { getPayload } from 'payload'
import { seedExampleBuild } from './exampleBuild'
import { seedMarketplaces } from './marketplaces'
import { seedSources } from './sources'

const payload = await getPayload({ config })
await seedSources(payload)
await seedExampleBuild(payload)
await seedMarketplaces(payload)
payload.logger.info('Seed complete')
process.exit(0)
