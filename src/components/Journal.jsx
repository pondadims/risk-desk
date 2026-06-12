import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { fmt, money } from '../lib/format.js'
import { entryDecimals } from '../lib/calc.js'
import { useCountUp } from '../hooks/useCountUp.js'

const STATUS_CYCLE = ['Pending', 'Open', 'Win', 'Loss', 'BE']
const STATUS_STYLE = {
  Pending: { bg: '#FFD43B', text: '#0C2340', border: '#F2BE00' },
  Open:    { bg: '#2BB5EF', text: '#FFFFFF', border: '#0A78BE' },
  Win:     { bg: '#16A34A', text: '#FFFFFF', border: '#15803D' },
  Loss:    { bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C' },
  BE:      { bg: '#64748B', text: '#FFFFFF', border: '#475569' },
}

function AnimatedMoney({ value }) {
  const d = useCountUp(value)
  return <>{money(d)}</>
}

function exportCSV(trades, notify) {
  if (!trades.length) return notify('Nothing to export yet', '⚠')
  const head = ['Date','Pair','Direction','Entry','SL','TP','Leverage','Position (USDT)','Coins','Margin (USDT)','Risk (USDT)','Planned R:R','Status','Actual P&L (USDT)']
  const rows = trades.map((t) => [
    new Date(t.created_at).toLocaleDateString('en-US'), t.pair, t.direction,
    t.entry, t.sl, t.tp ?? '', t.leverage,
    Number(t.position).toFixed(2), t.coins, Number(t.margin).toFixed(2),
    Number(t.risk).toFixed(2), Number(t.rr).toFixed(2), t.status,
    t.pl === '' || t.pl == null ? '' : t.pl,
  ])
  const csv = [head, ...rows].map((r) =>
    r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }).join(',')
  ).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'trade_journal.csv'; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  notify('CSV downloaded', '✓')
}

/* ── Mobile card ─────────────────────────────────── */
function MobileCard({ t, onCycle, onPL, onDelete, reduced }) {
  const pl   = t.pl === '' || t.pl == null ? '' : parseFloat(t.pl)
  const plColor = pl === '' ? 'text-muted' : pl > 0 ? 'text-profit' : pl < 0 ? 'text-loss' : 'text-muted'
  const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status) + 1) % STATUS_CYCLE.length]
  const ss   = STATUS_STYLE[t.status] || STATUS_STYLE.Pending

  return (
    <motion.div
      layout
      initial={reduced ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="bg-white rounded-[16px] p-4 flex flex-col gap-3 shadow-[0_1px_4px_rgba(14,42,71,.06)]"
      style={{ border: '1px solid rgba(14,42,71,.2)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display font-[700] text-[15px] text-ink2">{t.pair}</span>
          <span className={`text-[11px] font-[600] px-2 py-0.5 rounded-full
                            ${t.direction === 'Long' ? 'bg-blue text-white' : 'bg-short text-white'}`}>
            {t.direction}
          </span>
        </div>
        <span className="text-[11px] text-muted">
          {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Entry',    value: fmt(Number(t.entry), entryDecimals(t.entry)) },
          { label: 'Leverage', value: `${t.leverage}×` },
          { label: 'Position', value: `$${fmt(Number(t.position), 2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-paper rounded-[10px] px-2 py-2 text-center">
            <div className="text-[10px] font-[600] uppercase tracking-wide text-muted">{label}</div>
            <div className="hero-num font-[600] text-[13px] text-ink tnum mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <motion.button whileTap={reduced ? {} : { scale: 0.95 }}
          onClick={() => onCycle(t.id, next)}
          className="font-[600] text-[11.5px] px-3 py-1.5 rounded-full border cursor-pointer transition min-h-[36px]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}>
          {t.status}
        </motion.button>
        <input defaultValue={pl === '' ? '' : pl} placeholder="P&L" aria-label="P&L"
          onBlur={(e) => onPL(t.id, e.target.value)}
          className={`flex-1 h-9 bg-paper border border-line rounded-[10px] font-sans font-[600] text-[13px]
                      px-3 text-right outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 ${plColor}`} />
        <motion.button whileTap={reduced ? {} : { scale: 0.9 }}
          onClick={() => onDelete(t.id)} aria-label="Delete trade"
          className="w-9 h-9 rounded-full border border-line text-muted flex items-center justify-center
                     cursor-pointer transition hover:border-red-200 hover:text-loss hover:bg-lossSoft
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ── Desktop table row ───────────────────────────── */
function DesktopRow({ t, onCycle, onPL, onDelete, reduced }) {
  const pl   = t.pl === '' || t.pl == null ? '' : parseFloat(t.pl)
  const plColor = pl === '' ? 'text-muted' : pl > 0 ? 'text-profit' : pl < 0 ? 'text-loss' : 'text-muted'
  const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status) + 1) % STATUS_CYCLE.length]
  const ss   = STATUS_STYLE[t.status] || STATUS_STYLE.Pending

  return (
    <motion.tr
      layout
      initial={reduced ? {} : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="hover:bg-blueSoft/25 transition [&>td]:py-4 [&>td]:px-5 [&>td]:border-b [&>td]:border-line [&>td]:whitespace-nowrap">
      <td className="text-[11.5px] text-muted font-sans">
        {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </td>
      <td className="font-display font-[700] text-[13px] text-ink2">{t.pair}</td>
      <td>
        <span className={`text-[10.5px] font-[700] px-2.5 py-[3px] rounded-full text-white
                          ${t.direction === 'Long' ? 'bg-long' : 'bg-short'}`}>
          {t.direction}
        </span>
      </td>
      <td className="text-right font-sans font-[600] text-[12.5px] text-ink tnum">
        {fmt(Number(t.entry), entryDecimals(t.entry))}
      </td>
      <td className="text-right font-sans text-[12.5px] text-muted tnum">{t.leverage}×</td>
      <td className="text-right font-sans font-[600] text-[12.5px] text-ink tnum">
        ${fmt(Number(t.position), 2)}
      </td>
      <td>
        <motion.button whileTap={reduced ? {} : { scale: 0.95 }}
          onClick={() => onCycle(t.id, next)}
          className="font-[600] text-[11px] px-3 py-1.5 rounded-full border cursor-pointer transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}>
          {t.status}
        </motion.button>
      </td>
      <td className="text-right">
        <input defaultValue={pl === '' ? '' : pl} placeholder="—" aria-label="P&L"
          onBlur={(e) => onPL(t.id, e.target.value)}
          className={`w-24 h-8 bg-paper border border-line rounded-[8px] font-sans font-[600] text-[12.5px]
                      px-2.5 text-right outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 tnum ${plColor}`} />
      </td>
      <td>
        <motion.button whileTap={reduced ? {} : { scale: 0.9 }}
          onClick={() => onDelete(t.id)} aria-label="Delete trade"
          className="w-8 h-8 rounded-full border border-transparent text-muted flex items-center justify-center
                     cursor-pointer transition hover:border-red-200 hover:text-loss hover:bg-lossSoft ml-auto
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
          </svg>
        </motion.button>
      </td>
    </motion.tr>
  )
}

/* ── Journal ─────────────────────────────────────── */
export default function Journal({ trades, stats, onCycle, onPL, onDelete, onClear, notify }) {
  const reduced = useReducedMotion()

  return (
    <motion.section
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.16, ease: 'easeOut' }}
      whileHover={reduced ? {} : { y: -2, boxShadow: '0 1px 3px rgba(14,42,71,.08), 0 20px 40px -14px rgba(14,42,71,.22)' }}
      style={{ border: '1px solid rgba(14,42,71,.2)' }}
      className="bg-card rounded-cardLg shadow-card overflow-hidden min-h-[540px]">

      {/* header */}
      <div className="px-6 pt-5 pb-4 border-b border-line flex items-center justify-between">
        <h2 className="font-display font-[700] text-[15px] text-ink2 m-0">Trade journal</h2>
        <span className="text-[11.5px] font-[500] text-muted tabular-nums">
          {stats.count} trade{stats.count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* stats row — light cards, blue top accent = same family as header/hover */}
      <div className="grid grid-cols-4 gap-2 px-6 mt-4 mb-3">
        {[
          { k: 'Trades',   v: stats.count,      color: '#0C2340' },
          { k: 'Win rate', v: stats.winRateText, color: stats.count > 0 ? '#16A34A' : '#5B7A99' },
          { k: 'Net P&L',  v: stats.netText,     color: stats.netPositive ? '#16A34A' : stats.netNegative ? '#DC2626' : '#0C2340' },
          { k: 'Avg R',    v: stats.avgRText,    color: stats.avgRPositive ? '#16A34A' : '#0C2340' },
        ].map(({ k, v, color }) => (
          <div key={k} className="rounded-[10px] px-3 py-2.5 text-center bg-white"
               style={{
                 border: '1px solid #D8EAF6',
                 borderTop: '2.5px solid #2BB5EF',
                 boxShadow: '0 1px 3px rgba(14,42,71,.05)',
               }}>
            <div className="text-[9px] font-[700] uppercase tracking-[.1em] mb-1 text-muted">{k}</div>
            <div className="hero-num font-[700] text-[16px] tnum" style={{ color }}>{v}</div>
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="flex gap-2 px-6 pb-4 flex-wrap">
        <motion.button whileTap={reduced ? {} : { scale: 0.97 }}
          onClick={() => exportCSV(trades, notify)}
          className="flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-line bg-paper
                     text-[12px] font-[600] text-muted cursor-pointer transition
                     hover:border-blueInk/40 hover:text-blueInk hover:bg-blueSoft
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
          Export CSV
        </motion.button>
        <div className="flex-1" />
        <motion.button whileTap={reduced ? {} : { scale: 0.97 }}
          onClick={onClear}
          className="flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-line bg-paper
                     text-[12px] font-[600] text-muted cursor-pointer transition
                     hover:border-red-200 hover:text-loss hover:bg-lossSoft
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
          Clear all
        </motion.button>
      </div>

      {/* empty state */}
      {trades.length === 0 ? (
        <motion.div
          initial={reduced ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blueSoft flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0A78BE" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className="font-display font-[700] text-[15px] text-ink2 mb-1 m-0">No trades yet</p>
          <p className="text-[13px] text-muted m-0">Size a position on the left, then hit "Log trade."</p>
        </motion.div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden px-4 pb-5 flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {trades.map((t) => (
                <MobileCard key={t.id} t={t} onCycle={onCycle} onPL={onPL} onDelete={onDelete} reduced={reduced} />
              ))}
            </AnimatePresence>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto pb-2">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="[&>th]:py-3 [&>th]:px-5 [&>th]:border-b [&>th]:border-line
                               [&>th]:font-sans [&>th]:font-[700] [&>th]:text-[9.5px]
                               [&>th]:tracking-[.1em] [&>th]:uppercase [&>th]:text-ink2 [&>th]:text-left"
                    style={{ background: 'rgba(43,181,239,.10)' }}>
                  <th>Date</th><th>Pair</th><th>Dir</th>
                  <th className="text-right">Entry</th>
                  <th className="text-right">Lev</th>
                  <th className="text-right">Pos $</th>
                  <th>Status</th>
                  <th className="text-right">P&L</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {trades.map((t) => (
                    <DesktopRow key={t.id} t={t} onCycle={onCycle} onPL={onPL} onDelete={onDelete} reduced={reduced} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.section>
  )
}
