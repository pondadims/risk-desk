// Serverless proxy: returns the list of USDT-perp tradable symbols from Bitget.
// In-memory cache with ~5-min TTL avoids hammering the upstream on every keystroke.
//
// GET /api/symbols
// → 200: [{ symbol: "BTCUSDT", baseCoin: "BTC" }, ...]
// → 502: { error: "..." }

const CACHE_TTL_MS = 5 * 60 * 1000
let cache = { data: null, at: 0 }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return res.status(200).json(cache.data)
  }

  const url = 'https://api.bitget.com/api/v2/mix/market/contracts?productType=usdt-futures'

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!upstream.ok) {
      return res.status(502).json({ error: `Bitget returned ${upstream.status}` })
    }

    let json
    try { json = await upstream.json() }
    catch { return res.status(502).json({ error: 'Non-JSON response from Bitget' }) }

    if (json.code !== '00000' || !Array.isArray(json.data)) {
      return res.status(502).json({ error: json.msg || 'Unexpected Bitget response' })
    }

    const symbols = json.data.map((c) => ({
      symbol:   c.symbol,
      baseCoin: c.baseCoin,
    }))

    cache = { data: symbols, at: Date.now() }
    return res.status(200).json(symbols)
  } catch (e) {
    const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError'
    return res.status(502).json({
      error: timedOut ? 'Bitget request timed out' : `Bitget unavailable: ${e.message}`,
    })
  }
}
