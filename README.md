# Risk Desk

Futures position-sizing calculator + persistent trade journal. Deployed as a single Vercel project: React frontend + serverless API functions backed by [Neon](https://neon.tech) Postgres.

## How it works

| Layer | Tech | Where it runs |
|-------|------|---------------|
| Frontend | Vite + React 18 + Tailwind | Vercel CDN |
| API | Vercel serverless functions (`/api`) | Vercel edge/lambda |
| Database | PostgreSQL 16 | Neon (free tier) |

Trades and account settings are stored in Postgres so your journal is available from any device.

## Local development

### Option A — browser storage (no DB needed)

```bash
npm install
npm run dev          # http://localhost:5173
```

Trades are stored in `localStorage`. No database required.

### Option B — Postgres (full stack, same as production)

1. Create a free database at [neon.tech](https://neon.tech).
2. Copy your connection string.
3. Copy `.env.example` → `.env` and fill in:
   ```
   VITE_STORAGE=api
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   ```
4. Run the schema migration:
   ```bash
   npm run db:init
   ```
   This creates the `account` and `trades` tables and seeds the account row.
5. Start with `vercel dev` (not plain `npm run dev` — that won't serve `/api`):
   ```bash
   npx vercel dev      # http://localhost:3000
   ```

## Deploy to Vercel + Neon

### 1. Neon database

1. Go to [neon.tech](https://neon.tech) → create a free project.
2. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`).
3. In Neon's **SQL Editor**, paste the contents of `db/schema.sql` and run it.
   - Creates `account` and `trades` tables.
   - Seeds one account row with `starting_balance = 0` and `default_risk_pct = 2`.

   Alternatively, run locally:
   ```bash
   DATABASE_URL="your-neon-url" npm run db:init
   ```

### 2. Vercel project

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. Framework preset: **Vite** (auto-detected).
4. Under **Environment Variables**, add:
   | Name | Value |
   |------|-------|
   | `VITE_STORAGE` | `api` |
   | `DATABASE_URL` | your Neon connection string |
5. Click **Deploy**.

That's it. Vercel builds the Vite frontend and deploys the `/api` folder as serverless functions. Both share the same domain.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_STORAGE` | no | `local` | `local` = localStorage, `api` = Postgres |
| `DATABASE_URL` | when `VITE_STORAGE=api` | — | Neon (or any Postgres) connection string |

## Project structure

```
/
├── api/
│   ├── _db.js              shared pg Pool
│   ├── account.js          GET + PATCH /api/account
│   └── trades/
│       ├── index.js        GET + POST  /api/trades
│       └── [id].js         PATCH + DELETE /api/trades/:id
├── db/
│   └── schema.sql          table definitions + account seed
├── scripts/
│   └── init-db.js          npm run db:init
└── src/
    ├── lib/
    │   ├── calc.js         pure sizing engine (unit-tested)
    │   ├── calc.test.js    Vitest tests
    │   ├── api.js          fetch wrapper (local/api modes)
    │   ├── format.js       number formatters
    │   └── stats.js        win rate, net P&L, avg R
    └── components/
        ├── Header.jsx      balances, growth %, stats
        ├── Settings.jsx    edit starting_balance + default_risk_pct
        ├── Calculator.jsx  inputs, live sizing outputs, Log button
        ├── LiquidationGauge.jsx  SL vs Liq track + verdict badge
        └── Journal.jsx     trade table, status cycle, P&L, CSV export
```

## Sizing math

```
risk       = balance × riskPct / 100      ← fixed; never multiplied by leverage
slDist     = |entry − sl| / entry
position   = risk / slDist                ← notional USDT
coins      = position / entry             ← quantity to enter in the exchange
margin     = position / leverage          ← collateral locked
rr         = |tp − entry| / |entry − sl|
liqMovePct = 100 / leverage
verdict    = liqMovePct > slPct × 1.5 ? "safe" : liqMovePct > slPct ? "tight" : "danger"
```

## Tests

```bash
npm test             # vitest run (one-shot)
npm run test:watch   # watch mode
```

## .gitignore covers

`node_modules`, `.env`, `dist`, `.vercel`
