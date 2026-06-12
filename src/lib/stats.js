import { money, fmt } from './format.js'

export function deriveStats(trades) {
  const wins = trades.filter((t) => t.status === 'Win').length
  const losses = trades.filter((t) => t.status === 'Loss').length
  const decisive = wins + losses
  const winRate = decisive > 0 ? Math.round((wins / decisive) * 100) : null

  let net = 0, rSum = 0, rCount = 0
  for (const t of trades) {
    const p = parseFloat(t.pl)
    if (Number.isFinite(p)) {
      net += p
      if (Number(t.risk) > 0) { rSum += p / Number(t.risk); rCount++ }
    }
  }
  const avgR = rCount > 0 ? rSum / rCount : null

  return {
    count: trades.length,
    winRateText: winRate === null ? '—' : winRate + '%',
    netText: money(net),
    netPositive: net > 0,
    netNegative: net < 0,
    avgRText: avgR === null ? '—' : (avgR > 0 ? '+' : '') + fmt(avgR, 2) + 'R',
    avgRPositive: avgR !== null && avgR > 0,
  }
}
