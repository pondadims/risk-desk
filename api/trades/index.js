import { getPool, serialize } from '../_db.js'

export default async function handler(req, res) {
  let pool
  try { pool = getPool() } catch (e) { return res.status(500).json({ error: e.message }) }

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM trades ORDER BY created_at DESC')
      return res.status(200).json(rows.map(serialize))
    }

    if (req.method === 'POST') {
      const t = req.body || {}
      const { rows } = await pool.query(
        `INSERT INTO trades (pair, direction, entry, sl, tp, leverage, position, coins, margin, risk, rr, status, pl)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [t.pair, t.direction, t.entry, t.sl, t.tp ?? null, t.leverage,
         t.position, t.coins, t.margin, t.risk, t.rr ?? null,
         t.status || 'Pending', t.pl === '' ? null : t.pl ?? null],
      )
      return res.status(201).json(serialize(rows[0]))
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
