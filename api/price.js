// Serverless proxy: fetches the current USDT-perp price from Bitget.
// Avoids browser CORS by running server-side.
//
// GET /api/price?symbol=BTCUSDT
// → 200: { symbol: "BTCUSDT", price: 105230.5 }
// → 400: { error: "symbol parameter is required" }
// → 404: { error: "Symbol not found on Bitget" }
// → 502: { error: "Bitget unavailable: ..." }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let { symbol } = req.query
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'symbol parameter is required' })
  }

  // Normalise: uppercase, strip non-alphanumeric, ensure USDT suffix
  symbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!symbol.endsWith('USDT') && !symbol.endsWith('USDC')) {
    symbol = symbol + 'USDT'
  }

  const url = `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${encodeURIComponent(symbol)}&productType=usdt-futures`

  try {
    const upstream = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    })

    if (!upstream.ok) {
      return res.status(502).json({ error: `Bitget returned ${upstream.status}` })
    }

    const json = await upstream.json()

    // Bitget v2 response: { code, msg, data: [ { symbol, lastPr, ... } ] }
    if (json.code !== '00000') {
      // code 40034 = symbol not found
      const notFound = json.code === '40034' || /not exist|not found/i.test(json.msg || '')
      return res.status(notFound ? 404 : 502).json({
        error: notFound ? `Symbol ${symbol} not found on Bitget` : (json.msg || 'Bitget error'),
      })
    }

    const ticker = Array.isArray(json.data) ? json.data[0] : null
    if (!ticker || ticker.lastPr == null) {
      return res.status(404).json({ error: `No price data for ${symbol}` })
    }

    const price = parseFloat(ticker.lastPr)
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(502).json({ error: 'Invalid price received from Bitget' })
    }

    return res.status(200).json({ symbol, price })
  } catch (e) {
    const timedOut = e.name === 'TimeoutError' || e.name === 'AbortError'
    return res.status(502).json({
      error: timedOut ? 'Bitget request timed out' : `Bitget unavailable: ${e.message}`,
    })
  }
}
