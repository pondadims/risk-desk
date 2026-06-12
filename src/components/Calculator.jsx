import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { computeTrade, coinDecimals, symbolFromPair } from '../lib/calc.js'
import { parseNumber } from '../lib/parseNumber.js'
import { fmt, money } from '../lib/format.js'
import { useCountUp } from '../hooks/useCountUp.js'
import LiquidationGauge from './LiquidationGauge.jsx'

// ── Symbol list (for pair autocomplete) ───────────────────────────────────────
function useSymbols() {
  const [symbols, setSymbols] = useState([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/symbols')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { if (!cancelled && Array.isArray(data)) setSymbols(data) })
      .catch(() => {}) // silent — field works as free-text fallback
    return () => { cancelled = true }
  }, [])
  return symbols
}

const INIT = { pair: '', riskPct: '', entry: '', sl: '', tp: '', leverage: 5 }

// ── Entry ownership ────────────────────────────────────────────────────────────
// 'auto'  → field may be overwritten by a successful price fetch
// 'user'  → user has typed here; only a manual ↻ tap may overwrite
//
// Transitions:
//   pair changes          → 'auto'  (new pair legitimately prefills)
//   user types in entry   → 'user'
//   auto-fetch prefills   → 'user'  (one-shot; same pair won't overwrite again)
//   manual ↻ tap          → 'auto'  then fetch; on success → 'user'
// ──────────────────────────────────────────────────────────────────────────────

// ── Live-price fetch (no auto-polling; triggered explicitly) ──────────────────
function usePriceFetcher() {
  const [state, setState] = useState({ price: null, fetchedAt: null, loading: false, error: null })
  const abortRef = useRef(null)

  const fetchPrice = useCallback(async (sym) => {
    if (!sym || sym.trim().length < 2) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(
        `/api/price?symbol=${encodeURIComponent(sym.trim())}`,
        { signal: abortRef.current.signal },
      )
      // Safely parse JSON — server might return non-JSON on misconfiguration
      let json
      try { json = await res.json() }
      catch { throw new Error("Couldn't fetch live price — enter it manually.") }

      if (!res.ok) throw new Error(json?.error || "Couldn't fetch live price — enter it manually.")

      const price = Number(json.price)
      if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price received.')

      setState({ price, fetchedAt: new Date(), loading: false, error: null })
      return price          // caller uses this to decide whether to prefill
    } catch (e) {
      if (e.name === 'AbortError') return null
      setState((s) => ({ ...s, loading: false, error: e.message }))
      return null           // signal failure without mutating entry
    }
  }, [])

  return { ...state, fetchPrice }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Num({ value, decimals = 2, prefix = '' }) {
  const d = useCountUp(value)
  return <>{prefix}{fmt(d, decimals)}</>
}

function Field({ label, hint, suffix, id, action, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}
        className="text-[10.5px] font-[600] uppercase tracking-[.07em] text-muted flex justify-between items-center">
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          {hint && <span className="normal-case tracking-normal font-[500] text-muted/55">{hint}</span>}
          {action}
        </span>
      </label>
      <div className="relative">
        <input id={id} {...props}
          className="w-full h-10 bg-white border border-line rounded-[10px] text-ink font-sans font-[600] text-[14px]
                     px-3 shadow-input outline-none transition
                     focus:border-blue focus:ring-2 focus:ring-blue/20
                     placeholder:text-muted/30" />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11.5px] pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Pair combobox ─────────────────────────────────────────────────────────────
function PairField({ value, onChange, onSelect, symbols }) {
  const [open, setOpen]       = useState(false)
  const [active, setActive]   = useState(-1)
  const containerRef          = useRef(null)
  const listRef               = useRef(null)
  const inputId               = 'f-pair'

  const filtered = useMemo(() => {
    if (!symbols.length || !value.trim()) return []
    const q = value.trim().toLowerCase()
    return symbols
      .filter((s) => s.symbol.toLowerCase().includes(q) || s.baseCoin.toLowerCase().includes(q))
      .slice(0, 8)
  }, [symbols, value])

  // Close on outside click
  useEffect(() => {
    function down(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setActive(-1)
      }
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (active >= 0 && listRef.current) {
      const el = listRef.current.children[active]
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [active])

  function handleKeyDown(e) {
    if (!open || !filtered.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); select(filtered[active].symbol) }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  function select(sym) {
    ;(onSelect ?? onChange)(sym)
    setOpen(false); setActive(-1)
  }

  const showDropdown = open && filtered.length > 0

  return (
    <div ref={containerRef} className="col-span-2 flex flex-col gap-1">
      <label htmlFor={inputId}
        className="text-[10.5px] font-[600] uppercase tracking-[.07em] text-muted">
        Pair
      </label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="pair-listbox"
          aria-activedescendant={active >= 0 ? `pair-opt-${active}` : undefined}
          autoComplete="off"
          placeholder="e.g. BTCUSDT"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-10 bg-white border border-line rounded-[10px] text-ink font-sans font-[600] text-[14px]
                     px-3 shadow-input outline-none transition
                     focus:border-blue focus:ring-2 focus:ring-blue/20
                     placeholder:text-muted/30"
        />
        {showDropdown && (
          <ul
            id="pair-listbox"
            role="listbox"
            ref={listRef}
            className="absolute z-50 left-0 right-0 top-[calc(100%+4px)]
                       bg-white border border-line rounded-[12px] shadow-card
                       max-h-[240px] overflow-y-auto py-1"
          >
            {filtered.map((s, i) => (
              <li
                key={s.symbol}
                id={`pair-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); select(s.symbol) }}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer
                             font-sans text-[13.5px] select-none
                             ${i === active ? 'bg-blueSoft text-blueInk' : 'text-ink hover:bg-paper'}`}
              >
                <span className="font-[700]">{s.symbol}</span>
                <span className="text-muted text-[11.5px]">{s.baseCoin}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Tile({ label, children, bg, textColor, wide }) {
  return (
    <div
      className={`rounded-[12px] px-3.5 py-3 ${wide ? 'col-span-2' : ''}`}
      style={{
        background: bg,
        border: '1px solid rgba(14,42,71,0.10)',
        boxShadow: '0 1px 4px rgba(14,42,71,.14)',
      }}>
      <div className="text-[9.5px] font-[700] uppercase tracking-[.08em] mb-1"
           style={{ color: textColor ? `${textColor}B3` : 'rgba(14,42,71,.5)' }}>
        {label}
      </div>
      <div className="hero-num font-[700] text-[19px] leading-none tnum"
           style={{ color: textColor || '#0E2A47' }}>
        {children}
      </div>
    </div>
  )
}

function Warnings({ warnings }) {
  if (!warnings?.length) return null
  return (
    <div className="rounded-[12px] border border-[#F2BE00] bg-white px-4 py-3 flex gap-3 items-start">
      <span className="text-ink text-[16px] shrink-0 mt-0.5">⚠</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {warnings.map((w, i) => (
          <li key={i} className="text-[12.5px] font-[500] text-ink leading-snug">{w}</li>
        ))}
      </ul>
    </div>
  )
}

// ── Calculator ────────────────────────────────────────────────────────────────
export default function Calculator({ account, onLog }) {
  const reduced = useReducedMotion()
  const [f, setF]     = useState(INIT)
  const [dir, setDir] = useState('Long')
  const priceFetcher  = usePriceFetcher()
  const debounceRef   = useRef(null)
  const symbols       = useSymbols()

  // 'auto' = field is free to be prefilled by a fetch result
  // 'user' = user owns this value; only explicit ↻ tap may change it
  const entryOwner = useRef('auto')

  // ── Prefill entry when a successful fetch arrives ────────────────────────
  useEffect(() => {
    const { price } = priceFetcher
    if (price && price > 0 && entryOwner.current === 'auto') {
      setF((p) => ({ ...p, entry: String(price) }))
      entryOwner.current = 'user'   // one-shot — same pair won't overwrite again
    }
    // We intentionally do NOT react to entryOwner in deps — it's a ref, not state.
    // This effect runs only when `price` changes (a new fetch completed).
  }, [priceFetcher.price]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Input handlers ────────────────────────────────────────────────────────
  const applyPair = useCallback((newPair, immediate = false) => {
    entryOwner.current = 'auto'
    setF((p) => ({ ...p, pair: newPair, entry: '' }))
    clearTimeout(debounceRef.current)
    if (immediate) {
      priceFetcher.fetchPrice(newPair)
    } else {
      debounceRef.current = setTimeout(() => priceFetcher.fetchPrice(newPair), 500)
    }
  }, [priceFetcher.fetchPrice])

  const handlePairChange = useCallback((newPair) => {
    applyPair(newPair, false)
  }, [applyPair])

  const handlePairSelect = useCallback((sym) => {
    applyPair(sym, true)
  }, [applyPair])

  const handleEntryChange = useCallback((e) => {
    // User is now the owner — auto-fetch must never overwrite this
    entryOwner.current = 'user'
    setF((p) => ({ ...p, entry: e.target.value }))
  }, [])

  const handleManualRefresh = useCallback(() => {
    // Release ownership so the incoming price will prefill the field
    entryOwner.current = 'auto'
    priceFetcher.fetchPrice(f.pair)
  }, [f.pair, priceFetcher.fetchPrice])

  const set = useCallback((k) => (e) => setF((p) => ({ ...p, [k]: e.target.value })), [])

  // ── Parsed values (tolerant locale parsing) ───────────────────────────────
  const balance      = account?.current_balance ?? 0
  const riskPct      = f.riskPct !== '' ? parseNumber(f.riskPct) : (account?.default_risk_pct ?? 2)
  const parsedEntry  = parseNumber(f.entry)
  const parsedSl     = parseNumber(f.sl)
  const parsedTp     = parseNumber(f.tp)

  const c = useMemo(() => computeTrade({
    balance,
    riskPct,
    entry:    parsedEntry,
    sl:       parsedSl,
    tp:       parsedTp,
    leverage: Number(f.leverage),
  }), [balance, riskPct, parsedEntry, parsedSl, parsedTp, f.leverage])

  const sym = symbolFromPair(f.pair)

  // ── Log-readiness guard ───────────────────────────────────────────────────
  // All three must be true before we allow logging a trade
  const canLog = parsedEntry > 0 && parsedSl > 0 && c.coins > 0

  function log() {
    if (!canLog) return
    onLog({
      pair:      f.pair.trim() || '—',
      direction: dir,
      entry:     parsedEntry,
      sl:        parsedSl,
      tp:        parsedTp > 0 ? parsedTp : null,
      leverage:  Number(f.leverage),
      position:  c.position,
      coins:     c.coins,
      margin:    c.margin,
      risk:      c.risk,
      rr:        c.rr,
      status:    'Pending',
      pl:        '',
    })
  }

  // ── Price label ───────────────────────────────────────────────────────────
  const priceHint = priceFetcher.loading
    ? 'fetching…'
    : priceFetcher.fetchedAt
      ? `live · ${priceFetcher.fetchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : null

  return (
    <motion.section
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.08, ease: 'easeOut' }}
      whileHover={reduced ? {} : { y: -2, boxShadow: '0 1px 3px rgba(14,42,71,.08), 0 20px 40px -14px rgba(14,42,71,.22)' }}
      className="bg-yellow rounded-cardLg border border-[#F2BE00]/50 shadow-card overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3.5 border-b border-line flex items-center justify-between">
        <h2 className="font-display font-[700] text-[15px] text-ink2 m-0">Position size</h2>
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
             style={{ background: 'rgba(255,255,255,0.5)' }}>
          <span className="text-[10.5px] font-[600] text-muted">from</span>
          <span className="hero-num font-[700] text-[13.5px] text-ink tnum">{money(balance)}</span>
        </div>
      </div>

      {/* ── 2-col body: inputs | results+gauge+log — collapses to single column on mobile ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y divide-[#F2BE00]/60 lg:divide-y-0 lg:divide-x">

        {/* ── Col 1: Inputs ── */}
        <div className="px-5 pt-4 pb-5 space-y-3">
          {/* Direction toggle */}
          <div className="flex gap-1.5 p-1 rounded-[12px] border border-[#F2BE00]/60"
               style={{ background: 'rgba(255,255,255,0.5)' }}
               role="group" aria-label="Trade direction">
            {['Long', 'Short'].map((d) => {
              const on = dir === d
              return (
                <motion.button key={d} onClick={() => setDir(d)}
                  whileTap={reduced ? {} : { scale: 0.96 }}
                  className={`flex-1 h-10 rounded-[9px] font-sans font-[700] text-[13.5px] cursor-pointer transition-all
                               flex items-center justify-center gap-2
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1
                               ${on
                                 ? 'bg-ink text-white shadow-[0_3px_12px_-3px_rgba(14,42,71,.4)]'
                                 : 'hover:text-ink'}`}
                  style={on ? {} : { color: 'rgba(14,42,71,0.55)' }}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-current transition-opacity ${on ? 'opacity-100' : 'opacity-25'}`} />
                  {d}
                </motion.button>
              )
            })}
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-2 gap-2.5">
            <PairField
              value={f.pair}
              onChange={handlePairChange}
              onSelect={handlePairSelect}
              symbols={symbols}
            />

            <Field id="f-risk" label="Risk"
                   hint={f.riskPct === '' ? `default ${account?.default_risk_pct ?? 2}%` : undefined}
                   suffix="%" type="text" inputMode="decimal"
                   value={f.riskPct} onChange={set('riskPct')}
                   placeholder={String(account?.default_risk_pct ?? 2)} />

            <Field id="f-entry" label="Entry price"
                   hint={priceHint ?? undefined}
                   action={
                     <button type="button"
                       onClick={handleManualRefresh}
                       disabled={priceFetcher.loading || !f.pair.trim()}
                       aria-label="Fetch live price from Bitget"
                       className="text-blueInk/70 hover:text-blueInk cursor-pointer
                                  disabled:opacity-35 disabled:cursor-not-allowed
                                  rounded p-0.5 transition
                                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                            className={priceFetcher.loading ? 'animate-spin' : ''}>
                         <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                         <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                       </svg>
                     </button>
                   }
                   type="text" inputMode="decimal"
                   value={f.entry} onChange={handleEntryChange}
                   placeholder="0.00" />

            <Field id="f-sl" label="Stop loss"
                   type="text" inputMode="decimal"
                   value={f.sl} onChange={set('sl')} placeholder="0.00" />

            <Field id="f-tp" label="Take profit" hint="optional"
                   type="text" inputMode="decimal"
                   value={f.tp} onChange={set('tp')} placeholder="0.00" />
          </div>

          {/* Leverage */}
          <div className="rounded-[12px] border border-[#F2BE00]/60 px-3.5 py-3"
               style={{ background: 'rgba(255,255,255,0.5)' }}>
            <div className="flex justify-between items-center mb-2.5">
              <label htmlFor="leverage-slider"
                     className="text-[10.5px] font-[700] uppercase tracking-[.07em] text-muted">
                Leverage
              </label>
              <span className="hero-num font-[700] text-[20px] text-ink tnum leading-none">
                {f.leverage}<span className="text-[12px] font-[600] text-muted/70">×</span>
              </span>
            </div>
            <input id="leverage-slider" type="range" min="1" max="100"
                   value={f.leverage} onChange={set('leverage')}
                   aria-label={`Leverage: ${f.leverage}×`} />
            <div className="flex justify-between mt-1.5 text-[10px] font-[500] text-muted/45">
              <span>1×</span><span>25×</span><span>50×</span><span>75×</span><span>100×</span>
            </div>
          </div>

          {/* Inline notices */}
          <div className="flex flex-col gap-2">
            <Warnings warnings={c.warnings} />
            {priceFetcher.error && (
              <div className="text-[11.5px] text-muted/75 flex items-center gap-1.5 py-0.5">
                <span className="text-tight shrink-0 font-[600]">!</span>
                <span>{priceFetcher.error}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Col 2: Tiles + Gauge + Log ── */}
        <div className="px-5 pt-4 pb-5 flex flex-col gap-3">

          {/* Tile grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Quantity — hero, floats directly on yellow */}
            <div className="col-span-2 pb-3 mb-1 flex items-center justify-between"
                 style={{ borderBottom: '1.5px solid rgba(242,190,0,.7)' }}>
              <div>
                <div className="text-[9.5px] font-[700] uppercase tracking-[.09em] mb-1"
                     style={{ color: 'rgba(14,42,71,.55)' }}>
                  Quantity to enter
                </div>
                <div className="hero-num font-[700] text-[26px] leading-none tnum"
                     style={{ color: '#0E2A47' }}>
                  {parsedEntry > 0 && c.coins > 0 ? fmt(Math.round(c.coins), 0) : '—'}
                  {parsedEntry > 0 && c.coins > 0 && (
                    <span className="text-[14px] font-[600] ml-2" style={{ color: 'rgba(14,42,71,.5)' }}>
                      {sym || 'COIN'}
                    </span>
                  )}
                </div>
              </div>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                   stroke="rgba(14,42,71,.2)" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>

            {/* Support tiles — cream chips, navy text */}
            <Tile label="Position value" bg="rgba(255,255,255,0.5)" textColor="#0E2A47">
              <Num value={c.position} prefix="$" />
            </Tile>
            <Tile label="Margin required" bg="rgba(255,255,255,0.5)" textColor="#0E2A47">
              <Num value={c.margin} prefix="$" />
            </Tile>
            <Tile label="Max loss at stop" bg="rgba(255,255,255,0.5)" textColor="#0E2A47">
              <Num value={c.risk} prefix="$" />
            </Tile>
            <Tile label="Reward / risk" bg="rgba(255,255,255,0.5)" textColor="#0E2A47">
              <span><Num value={c.rr} /></span>
              <span className="text-[12px] font-[600] ml-1" style={{ color: 'rgba(14,42,71,.45)' }}>R</span>
            </Tile>
          </div>

          {/* Gauge — cream inset biar track/marker kebaca di atas kuning */}
          <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '16px', border: '1px solid rgba(14,42,71,0.10)' }}>
            <LiquidationGauge slPct={c.slPct} liqMovePct={c.liqMovePct} verdict={c.verdict} leverage={f.leverage} />
          </div>

          {/* Log trade */}
          <div className="mt-auto flex flex-col gap-1.5">
            {!canLog && (parsedEntry <= 0 || f.entry !== '') && (
              <p className="text-center text-[11.5px] text-muted m-0">
                Enter entry price and stop loss first.
              </p>
            )}
            <motion.button
              onClick={log}
              disabled={!canLog}
              whileHover={reduced || !canLog ? {} : { scale: 1.015 }}
              whileTap={reduced || !canLog ? {} : { scale: 0.97 }}
              style={{ background: canLog ? '#0E2A47' : 'rgba(255,255,255,.45)' }}
              className={`w-full h-12 rounded-full font-sans font-[700] text-[14.5px]
                           flex items-center justify-center gap-2 transition-all
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-yellow
                           ${canLog
                             ? 'cursor-pointer text-yellow shadow-[0_4px_20px_-6px_rgba(14,42,71,.5)]'
                             : 'cursor-not-allowed text-muted'}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.8" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Log trade
            </motion.button>
          </div>

        </div>

      </div>
    </motion.section>
  )
}
