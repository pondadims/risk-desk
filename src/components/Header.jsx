import { motion, useReducedMotion } from 'framer-motion'
import { fmt, money } from '../lib/format.js'
import { useCountUp } from '../hooks/useCountUp.js'

const INK  = '#0C2340'
const CARD = '#FFD43B'

// Semi-transparent white chip — stands out clearly on yellow
const CHIP_BG     = 'rgba(255,255,255,.42)'
const CHIP_BORDER = 'rgba(12,35,64,.18)'

export default function Header({ account, stats, onOpenSettings }) {
  const reduced = useReducedMotion()
  const { starting_balance = 0, current_balance = 0 } = account || {}
  const growth   = starting_balance > 0
    ? ((current_balance - starting_balance) / starting_balance) * 100
    : 0
  const growthUp = growth > 0

  const display = useCountUp(current_balance)

  const fadeUp = (delay = 0) => reduced
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 },
        transition: { duration: 0.32, delay, ease: 'easeOut' } }

  return (
    <motion.header
      className="mb-6"
      {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 },
                            transition: { duration: 0.28 } })}>

      <div className="relative overflow-hidden rounded-[28px]"
           style={{ background: CARD, boxShadow: '0 2px 20px rgba(12,35,64,.15)' }}>

        <div className="relative px-8 pt-7 pb-8 sm:px-10 sm:pt-8 sm:pb-9">

          {/* ── Top row: logo + settings ── */}
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] grid place-items-center shrink-0"
                   style={{
                     background: CHIP_BG,
                     border: `1px solid ${CHIP_BORDER}`,
                   }}>
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none"
                     stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l5-5 4 3 6-7" /><path d="M14 4h5v5" />
                </svg>
              </div>
              <span className="font-display font-[700] text-[14px] tracking-tight"
                    style={{ color: 'rgba(12,35,64,.65)' }}>
                Risk Desk
              </span>
            </div>

            <button onClick={onOpenSettings} aria-label="Account settings"
              className="w-9 h-9 rounded-full grid place-items-center cursor-pointer transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C2340] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFD43B]"
              style={{ background: CHIP_BG, border: `1px solid ${CHIP_BORDER}` }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.62)'}
              onMouseLeave={(e) => e.currentTarget.style.background = CHIP_BG}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="rgba(12,35,64,.65)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
          </div>

          {/* ── Balance + stats ── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">

            {/* Balance block */}
            <motion.div {...fadeUp(0.04)} className="flex flex-col gap-2 min-w-0">
              <span className="text-[10.5px] font-[700] uppercase tracking-[.12em]"
                    style={{ color: 'rgba(12,35,64,.55)' }}>
                Current balance
              </span>

              <div className="flex items-end gap-3 flex-wrap">
                <span className="hero-num font-[800] text-[60px] sm:text-[74px] leading-none tnum"
                      style={{ color: INK }}>
                  {money(display)}
                </span>

                {growth !== 0 && (
                  <motion.span
                    key={growthUp ? 'up' : 'down'}
                    initial={reduced ? {} : { scale: 0.82, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               font-sans font-[700] text-[12.5px]"
                    style={growthUp
                      ? { background: INK, color: CARD }
                      : { background: 'rgba(220,38,38,.15)', color: '#7F1D1D',
                          border: '1px solid rgba(220,38,38,.25)' }}>
                    <span className="text-[10px]">{growthUp ? '▲' : '▼'}</span>
                    {fmt(Math.abs(growth), 1)}%
                  </motion.span>
                )}
              </div>

              {/* "Started at" — outlined chip */}
              <div className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full"
                   style={{ background: CHIP_BG, border: `1px solid ${CHIP_BORDER}` }}>
                <span className="text-[11px] font-[500]" style={{ color: 'rgba(12,35,64,.55)' }}>
                  Started at
                </span>
                <span className="hero-num text-[12px] font-[700] tnum" style={{ color: INK }}>
                  {money(starting_balance)}
                </span>
              </div>
            </motion.div>

            {/* Stats — each as an outlined chip */}
            <motion.div {...fadeUp(0.1)}
              className="flex flex-wrap sm:flex-nowrap items-end gap-2">
              {[
                { label: 'Trades',   value: stats.count,       pos: false, neg: false, hi: false },
                { label: 'Win rate', value: stats.winRateText, pos: false, neg: false, hi: stats.count > 0 },
                { label: 'Net P&L',  value: stats.netText,     pos: stats.netPositive, neg: stats.netNegative, hi: false },
              ].map(({ label, value, pos, neg, hi }) => (
                <div key={label}
                     className="flex flex-col items-center px-4 py-2.5 rounded-[14px]"
                     style={{
                       background: CHIP_BG,
                       border: `1px solid ${CHIP_BORDER}`,
                       minWidth: '80px',
                     }}>
                  <span className="text-[9.5px] font-[700] uppercase tracking-[.1em] mb-1"
                        style={{ color: 'rgba(12,35,64,.5)' }}>
                    {label}
                  </span>
                  <span className="hero-num font-[700] text-[17px] tnum leading-tight"
                        style={{
                          color: pos ? '#15803D'
                               : neg ? '#DC2626'
                               : hi  ? '#15803D'
                               : INK,
                        }}>
                    {value}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
