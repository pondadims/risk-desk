# Risk Desk — CLAUDE.md

A futures **position-sizing calculator + trade journal** for crypto perpetuals (Bitget). The owner trades perps; this tool enforces risk-first sizing discipline.

## Stack

- **Frontend:** Vite + React + Tailwind CSS + Framer Motion
- **Backend:** Vercel serverless functions in `/api/`
- **Database:** Neon Postgres (`VITE_STORAGE=api`); also a full localStorage mode (`VITE_STORAGE=local`, default for `npm run dev`)
- **Tests:** Vitest — currently 61 passing (`npm test`)
- **Deploy:** Vercel + Neon

## Core philosophy

> Risk first → size from the stop → leverage last → liquidation must sit beyond the stop.

## Sizing formulas (`src/lib/calc.js` — DO NOT CHANGE)

```
risk        = balance * riskPct / 100       // max loss in USDT. Never multiplied by leverage.
slDist      = |entry - sl| / entry          // fractional stop distance
position    = risk / slDist                 // notional position size (USDT)
coins       = position / entry              // quantity to enter on the exchange
margin      = position / leverage           // collateral locked
rr          = |tp - entry| / |entry - sl|
liqMovePct  = 100 / leverage               // approx % move to liquidation
verdict     = liqMovePct > slDist*100*1.5 → "safe"
            | liqMovePct > slDist*100     → "tight"
            | else                        → "danger"
```

Reference: balance 197.59, risk 2%, entry 0.1904, sl 0.1989, tp 0.1731, lev 5
→ risk 3.95, position 88.52, coins 465, margin 17.70, rr 2.04, verdict "safe".

## Key files

| File | Purpose |
|------|---------|
| `src/lib/calc.js` | Pure sizing engine + `consistencyGuard()`. Tested. DO NOT change formulas. |
| `src/lib/parseNumber.js` | Tolerant locale parser — `"105.000"→105000`, `"0.1904"→0.1904`. |
| `src/lib/calc.js` → `entryDecimals` | Price display decimals (not coins qty — see `coinDecimals` bug history). |
| `src/components/Calculator.jsx` | Inputs, pair-search combobox, leverage slider, result tiles, gauge, Log button. |
| `src/components/Journal.jsx` | Trade table, status badges, P&L editing, CSV export. |
| `src/components/Header.jsx` | Balance hero band. |
| `src/components/LiquidationGauge.jsx` | Animated gauge: stop vs liquidation distance. |
| `api/price.js` | Bitget USDT-perp ticker proxy (`GET /api/price?symbol=BTCUSDT`). |
| `api/symbols.js` | Bitget contract list with 5-min in-memory cache (for pair autocomplete). |
| `src/lib/api.js` | Storage adapter — same async interface for both localStorage and Postgres. |
| `db/schema.sql` | Postgres schema (trades + account tables). |

## Entry-ownership model (Calculator.jsx)

An `entryOwner` ref (`'auto'` | `'user'`) controls whether a live-price fetch may overwrite the Entry field:
- New pair typed → `'auto'` → one-shot prefill allowed
- User edits Entry manually → `'user'` → auto-fetch won't overwrite
- Manual ↻ tap → resets to `'auto'` → single refetch

## Rules for all future changes

1. **Never change** `src/lib/calc.js` formulas or `src/lib/parseNumber.js` logic.
2. **`npm test` must stay green** (61 tests, Vitest).
3. **Don't touch `/api/` unless the task is specifically about the API.**
4. **Don't change the data model** (trades table schema, account shape).
5. **Don't change balance-linking logic** (`current_balance = starting_balance + Σ pl`).
6. Use `entryDecimals(entry)` for formatting entry *prices* in the UI; use `coinDecimals(entry)` only for coin *quantities*.
