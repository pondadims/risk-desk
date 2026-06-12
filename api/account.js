import { getPool } from './_db.js'

function serializeAccount(row, currentBalance) {
  return {
    id: row.id,
    starting_balance: +row.starting_balance,
    default_risk_pct: +row.default_risk_pct,
    current_balance: +currentBalance,
    updated_at: row.updated_at,
  }
}

export default async function handler(req, res) {
  let pool
  try { pool = getPool() } catch (e) { return res.status(500).json({ error: e.message }) }

  try {
    if (req.method === 'GET') {
      const { rows: acctRows } = await pool.query('SELECT * FROM account WHERE id = 1')
      if (!acctRows.length) return res.status(404).json({ error: 'Account not found — run db/schema.sql first' })

      const { rows: plRows } = await pool.query(
        'SELECT COALESCE(SUM(pl), 0) AS total_pl FROM trades WHERE pl IS NOT NULL'
      )
      const currentBalance = +acctRows[0].starting_balance + +plRows[0].total_pl
      return res.status(200).json(serializeAccount(acctRows[0], currentBalance))
    }

    if (req.method === 'PATCH') {
      const body = req.body || {}
      const fields = [], values = []
      let i = 1
      if ('starting_balance' in body) { fields.push(`starting_balance = $${i++}`); values.push(body.starting_balance) }
      if ('default_risk_pct' in body) { fields.push(`default_risk_pct = $${i++}`); values.push(body.default_risk_pct) }
      if (!fields.length) return res.status(400).json({ error: 'No updatable fields supplied' })
      fields.push(`updated_at = now()`)
      const { rows: acctRows } = await pool.query(
        `UPDATE account SET ${fields.join(', ')} WHERE id = 1 RETURNING *`, values
      )
      const { rows: plRows } = await pool.query(
        'SELECT COALESCE(SUM(pl), 0) AS total_pl FROM trades WHERE pl IS NOT NULL'
      )
      const currentBalance = +acctRows[0].starting_balance + +plRows[0].total_pl
      return res.status(200).json(serializeAccount(acctRows[0], currentBalance))
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
