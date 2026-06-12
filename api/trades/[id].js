import { getPool, serialize } from '../_db.js'

export default async function handler(req, res) {
  let pool
  try { pool = getPool() } catch (e) { return res.status(500).json({ error: e.message }) }
  const { id } = req.query

  try {
    if (req.method === 'PATCH') {
      const body = req.body || {}
      const fields = [], values = []
      let i = 1
      for (const key of ['status', 'pl']) {
        if (key in body) {
          fields.push(`${key} = $${i++}`)
          values.push(body[key] === '' ? null : body[key])
        }
      }
      if (!fields.length) return res.status(400).json({ error: 'No updatable fields supplied' })
      values.push(id)
      const { rows } = await pool.query(
        `UPDATE trades SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values)
      return res.status(200).json(rows[0] ? serialize(rows[0]) : {})
    }

    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM trades WHERE id = $1', [id])
      return res.status(204).end()
    }

    res.setHeader('Allow', 'PATCH, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
