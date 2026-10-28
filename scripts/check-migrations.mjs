// Fails when the Payload collections changed without a migration (run before deploying / in CI).
// Creates a probe migration with --skip-empty; if one appears, removes it again and exits 1.
import { execSync } from 'child_process'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'

const dir = 'src/migrations'
const before = new Set(readdirSync(dir))
const index = readFileSync(`${dir}/index.ts`, 'utf8')

execSync('pnpm payload migrate:create pending_schema_check --skip-empty', { stdio: 'ignore', input: 'y\n' })

const added = readdirSync(dir).filter((f) => !before.has(f))
if (added.length) {
  for (const f of added) rmSync(`${dir}/${f}`)
  writeFileSync(`${dir}/index.ts`, index)
  console.error('Schema changes without a migration. Run: pnpm payload migrate:create <name>')
  process.exit(1)
}
console.log('Migrations are up to date.')
