// Pure position-sizing engine. No side effects — easy to test.
//
// Philosophy:
//   1. risk     = how much you're willing to lose (% of balance). FIXED.
//   2. position = risk / stop-loss distance. (leverage NOT involved)
//   3. coins    = position / entry price.    (what you type in the exchange)
//   4. margin   = position / leverage.       (what gets locked up)
// Leverage only decides margin + liquidation distance, never the loss.

export function computeTrade({ balance, riskPct, entry, sl, tp, leverage }) {
  balance  = Number(balance)  || 0
  riskPct  = Number(riskPct)  || 0
  entry    = Number(entry)    || 0
  sl       = Number(sl)       || 0
  tp       = Number(tp)       || 0
  leverage = Number(leverage) || 0

  const risk     = (balance * riskPct) / 100
  const slDist   = entry > 0 ? Math.abs(entry - sl) / entry : 0
  const position = slDist > 0 ? risk / slDist : 0
  const coins    = entry > 0 ? position / entry : 0
  const margin   = leverage > 0 ? position / leverage : 0
  const rr       = Math.abs(entry - sl) > 0 ? Math.abs(tp - entry) / Math.abs(entry - sl) : 0
  const liqMovePct = leverage > 0 ? 100 / leverage : 0
  const slPct    = slDist * 100

  let verdict = 'danger'
  if (liqMovePct > slPct * 1.5) verdict = 'safe'
  else if (liqMovePct > slPct)  verdict = 'tight'

  const warnings = consistencyGuard({ balance, entry, position, coins, margin, leverage })

  return { risk, slPct, position, coins, margin, rr, liqMovePct, verdict, warnings }
}

/**
 * Post-compute sanity checks. Returns an array of warning strings.
 * Empty array = all clear.
 *
 * Checks:
 *  1. coins × entry ≈ position  (invariant: always true by construction — if violated,
 *     something upstream went wrong, e.g. parseNumber wasn't used and a malformed entry
 *     was coerced differently than expected)
 *  2. margin > balance          (you can't lock up more than you have)
 *  3. position > balance × 500  (almost certainly a data-entry error)
 */
function consistencyGuard({ balance, entry, position, coins, margin, leverage }) {
  const warnings = []
  if (position <= 0 || entry <= 0 || coins <= 0) return warnings

  // Invariant: coins × entry must equal position (within 0.1%)
  const reconstructed = coins * entry
  const relErr = Math.abs(reconstructed - position) / position
  if (relErr > 0.001) {
    warnings.push('Entry price looks wrong — quantity and position value don\'t agree. Check for a thousands separator (e.g. "105.000" → should be 105,000?).')
  }

  // Margin must not exceed account balance (would be impossible to open the trade)
  if (balance > 0 && margin > balance * 1.05) {
    warnings.push('Margin required exceeds your account balance — you cannot open this position.')
  }

  // Position notional > balance × 500 is almost certainly a data-entry error
  if (balance > 0 && position > balance * 500) {
    warnings.push('Position size is unusually large relative to your balance — verify your entry price.')
  }

  return warnings
}

export function coinDecimals(entry) {
  entry = Number(entry) || 0
  if (entry >= 1000) return 4
  if (entry >= 10)   return 3
  if (entry >= 1)    return 2
  return 0
}

export function entryDecimals(entry) {
  entry = Number(entry) || 0
  if (entry >= 1000) return 2
  if (entry >= 1)    return 4
  return 4
}

export function symbolFromPair(pair) {
  return (String(pair || '').replace(/USDT$|USDC$|PERP$/i, '') || 'COIN')
}
