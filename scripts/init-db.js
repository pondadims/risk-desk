// One-time schema setup. Run locally after setting DATABASE_URL:
//   DATABASE_URL="postgres://..." npm run db:init
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const url = process.env.DATABASE_URL
if (!url) { console.error('✗ Set DATABASE_URL first'); process.exit(1) }

const schema = readFileSync(fileURLToPath(new URL('../db/schema.sql', import.meta.url)), 'utf8')
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })

try {
  await pool.query(schema)
  console.log('✓ schema applied — tables "account" and "trades" are ready')
  console.log('✓ account row seeded (id=1, starting_balance=0, default_risk_pct=2)')
} catch (e) {
  console.error('✗ failed:', e.message)
  process.exit(1)
} finally {
  await pool.end()
}
