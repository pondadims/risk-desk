// Shared Postgres pool for the serverless functions.
// Lives outside the request handler so connections are reused
// across warm invocations on Vercel.
import pg from 'pg'

let pool

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.')
    }
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    })
  }
  return pool
}

// Numerics come back from pg as strings — coerce to numbers for the client.
export function serialize(r) {
  return {
    ...r,
    entry: +r.entry, sl: +r.sl, tp: r.tp == null ? null : +r.tp,
    leverage: +r.leverage, position: +r.position, coins: +r.coins,
    margin: +r.margin, risk: +r.risk, rr: r.rr == null ? null : +r.rr,
    pl: r.pl == null ? '' : +r.pl,
  }
}
