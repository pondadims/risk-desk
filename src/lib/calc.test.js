import { describe, it, expect } from 'vitest'
import { computeTrade, coinDecimals, entryDecimals } from './calc.js'

describe('computeTrade — spec validation case', () => {
  const result = computeTrade({
    balance: 197.59,
    riskPct: 2,
    entry: 0.1904,
    sl: 0.1989,
    tp: 0.1731,
    leverage: 5,
  })

  it('risk = 3.95', () => expect(+result.risk.toFixed(2)).toBe(3.95))
  it('position ≈ 88.52', () => expect(+result.position.toFixed(2)).toBe(88.52))
  it('coins rounds to 465', () => expect(Math.round(result.coins)).toBe(465))
  it('margin ≈ 17.70', () => expect(+result.margin.toFixed(2)).toBe(17.70))
  it('rr ≈ 2.04', () => expect(+result.rr.toFixed(2)).toBe(2.04))
  it('liqMovePct = 20', () => expect(result.liqMovePct).toBe(20))
  it('verdict = "safe"', () => expect(result.verdict).toBe('safe'))
})

describe('computeTrade — edge cases', () => {
  it('returns zero position when sl equals entry (slDist = 0)', () => {
    const r = computeTrade({ balance: 100, riskPct: 2, entry: 1, sl: 1, tp: 2, leverage: 10 })
    expect(r.position).toBe(0)
    expect(r.coins).toBe(0)
  })

  it('verdict is "danger" when leverage is very high', () => {
    // liqMovePct = 100/100 = 1%, slPct >> 1%
    const r = computeTrade({ balance: 1000, riskPct: 2, entry: 100, sl: 95, tp: 110, leverage: 100 })
    expect(r.verdict).toBe('danger')
  })

  it('verdict is "tight" when liq is just past SL', () => {
    // slPct = 5%, liqMovePct = 6% → just past but < 1.5×
    const r = computeTrade({ balance: 1000, riskPct: 2, entry: 100, sl: 95, tp: 110, leverage: 16 })
    // liqMovePct = 100/16 = 6.25, slPct = 5 → 6.25 > 5 but < 7.5 → tight
    expect(r.verdict).toBe('tight')
  })

  it('handles zero balance gracefully', () => {
    const r = computeTrade({ balance: 0, riskPct: 2, entry: 100, sl: 95, tp: 110, leverage: 5 })
    expect(r.risk).toBe(0)
    expect(r.position).toBe(0)
  })
})

describe('computeTrade — warnings array present in all results', () => {
  it('spec case has no warnings (clean inputs)', () => {
    const r = computeTrade({ balance: 197.59, riskPct: 2, entry: 0.1904, sl: 0.1989, tp: 0.1731, leverage: 5 })
    expect(r.warnings).toEqual([])
  })

  it('zero position produces no warnings (nothing to check)', () => {
    const r = computeTrade({ balance: 100, riskPct: 2, entry: 1, sl: 1, tp: 2, leverage: 10 })
    expect(r.warnings).toEqual([])
  })
})

describe('computeTrade — consistency guard: margin > balance', () => {
  it('warns when margin exceeds account balance', () => {
    // balance=100, entry=100, sl=99 (1% stop), riskPct=2 → risk=2, position=200, margin=200/10=20 < 100 → no warn
    // Use leverage=1 so margin = position, and riskPct=50 so position = huge
    const r = computeTrade({ balance: 100, riskPct: 50, entry: 100, sl: 99, tp: 110, leverage: 1 })
    // risk=50, slDist=0.01, position=50/0.01=5000, margin=5000/1=5000 >> 100*1.05=105
    expect(r.warnings.some((w) => w.includes('balance'))).toBe(true)
  })

  it('no margin warning when margin is safely within balance', () => {
    const r = computeTrade({ balance: 1000, riskPct: 2, entry: 100, sl: 95, tp: 110, leverage: 10 })
    // risk=20, position=20/0.05=400, margin=400/10=40 < 1000
    expect(r.warnings.some((w) => w.includes('balance'))).toBe(false)
  })
})

describe('computeTrade — consistency guard: unusually large position', () => {
  it('warns when position exceeds balance × 500', () => {
    // balance=100, riskPct=2→risk=2, slDist tiny → position huge
    // entry=1000, sl=999.9 → slDist=0.0001 → position=2/0.0001=20000 > 100*500=50000? No.
    // Make slDist very tiny: sl=999.999, slDist=0.000001, position=2/0.000001=2_000_000
    const r = computeTrade({ balance: 100, riskPct: 2, entry: 1000, sl: 999.999, tp: 1010, leverage: 10 })
    expect(r.warnings.some((w) => w.includes('unusually large'))).toBe(true)
  })

  it('no size warning for a normal trade', () => {
    const r = computeTrade({ balance: 1000, riskPct: 2, entry: 100, sl: 95, tp: 110, leverage: 5 })
    expect(r.warnings.some((w) => w.includes('unusually large'))).toBe(false)
  })
})

describe('computeTrade — entry = 0 gives coins = 0 (log guard basis)', () => {
  it('entry=0 → coins=0, position=0 (unparsed/empty entry must not produce a loggable trade)', () => {
    const r = computeTrade({ balance: 500, riskPct: 2, entry: 0, sl: 95, tp: 110, leverage: 10 })
    expect(r.coins).toBe(0)
    expect(r.position).toBe(0)
  })

  it('entry=NaN (empty string coerced) → coins=0', () => {
    const r = computeTrade({ balance: 500, riskPct: 2, entry: NaN, sl: 95, tp: 110, leverage: 10 })
    expect(r.coins).toBe(0)
    expect(r.position).toBe(0)
  })
})

describe('parseNumber + computeTrade pipeline — the 105.000 BTC bug', () => {
  it('entry "105.000" (European thousands) → 105000 → quantity ≈ 0.0013 BTC, NOT ~1 BTC', async () => {
    // Dynamic import so this test file stays free of extra deps
    const { parseNumber } = await import('./parseNumber.js')
    const entry  = parseNumber('105.000')   // must be 105000
    const sl     = parseNumber('104.000')   // 1000 USDT stop
    expect(entry).toBe(105000)              // parseNumber contract
    const r = computeTrade({ balance: 500, riskPct: 2, entry, sl, tp: 110000, leverage: 10 })
    // coins = position / 105000; position = risk / slDist; slDist = 1000/105000 ≈ 0.00952
    // risk = 500*2/100 = 10; position = 10/0.00952 ≈ 1050; coins ≈ 0.01
    expect(r.coins).toBeGreaterThan(0.001)
    expect(r.coins).toBeLessThan(0.1)   // definitely NOT ~1 BTC
  })

  it('entry "105000" (no separator) → same result as "105.000"', async () => {
    const { parseNumber } = await import('./parseNumber.js')
    const r1 = computeTrade({ balance: 500, riskPct: 2, entry: parseNumber('105.000'), sl: parseNumber('104.000'), tp: 110000, leverage: 10 })
    const r2 = computeTrade({ balance: 500, riskPct: 2, entry: parseNumber('105000'),  sl: parseNumber('104000'),  tp: 110000, leverage: 10 })
    expect(+r1.coins.toFixed(6)).toBe(+r2.coins.toFixed(6))
    expect(+r1.position.toFixed(4)).toBe(+r2.position.toFixed(4))
  })
})

describe('coinDecimals', () => {
  it('entry >= 1000 → 4 decimals', () => expect(coinDecimals(2500)).toBe(4))
  it('entry >= 10 → 3 decimals', () => expect(coinDecimals(50)).toBe(3))
  it('entry >= 1 → 2 decimals', () => expect(coinDecimals(5)).toBe(2))
  it('entry < 1 → 0 decimals', () => expect(coinDecimals(0.19)).toBe(0))
})

describe('entryDecimals — price display decimals (not coins quantity)', () => {
  // Sub-$1 entries: must return > 0 so fmt() doesn't round them to "0"
  it('0.1904  → at least 1 decimal place (journal must not show "0")', () => expect(entryDecimals(0.1904)).toBeGreaterThanOrEqual(1))
  it('0.38    → at least 1 decimal place', () => expect(entryDecimals(0.38)).toBeGreaterThanOrEqual(1))
  it('0.0001  → at least 1 decimal place', () => expect(entryDecimals(0.0001)).toBeGreaterThanOrEqual(1))
  it('0.1889  → at least 1 decimal place', () => expect(entryDecimals(0.1889)).toBeGreaterThanOrEqual(1))

  // Formatting round-trip: sub-$1 values must not display as "0"
  it('fmt(0.1904, entryDecimals(0.1904)) !== "0"', async () => {
    const { fmt } = await import('../lib/format.js')
    expect(fmt(0.1904, entryDecimals(0.1904))).not.toBe('0')
    expect(fmt(0.1904, entryDecimals(0.1904))).toBe('0.1904')
  })
  it('fmt(0.38, entryDecimals(0.38)) !== "0"', async () => {
    const { fmt } = await import('../lib/format.js')
    expect(fmt(0.38, entryDecimals(0.38))).not.toBe('0')
  })
  it('fmt(0.0001, entryDecimals(0.0001)) !== "0"', async () => {
    const { fmt } = await import('../lib/format.js')
    expect(fmt(0.0001, entryDecimals(0.0001))).not.toBe('0')
  })

  // Regressions: values >= 1 still format sensibly
  it('1.22    → at least 2 decimal places', () => expect(entryDecimals(1.22)).toBeGreaterThanOrEqual(2))
  it('4250    → at least 2 decimal places', () => expect(entryDecimals(4250)).toBeGreaterThanOrEqual(2))
  it('105000  → at least 2 decimal places', () => expect(entryDecimals(105000)).toBeGreaterThanOrEqual(2))
  it('fmt(4250, entryDecimals(4250)) is not NaN/empty', async () => {
    const { fmt } = await import('../lib/format.js')
    const result = fmt(4250, entryDecimals(4250))
    expect(result).not.toBe('—')
    expect(Number(result.replace(/,/g, ''))).toBeCloseTo(4250, 0)
  })
})
