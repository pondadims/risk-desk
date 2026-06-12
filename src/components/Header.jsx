import { motion, useReducedMotion } from 'framer-motion'
import { fmt, money } from '../lib/format.js'
import { useCountUp } from '../hooks/useCountUp.js'

function AnimatedMoney({ value }) {
  const display = useCountUp(value)
  return <>{money(display)}</>
}

export default function Header({ account, stats, onOpenSettings }) {
  const reduced = useReducedMotion()
  const { starting_balance = 0, current_balance = 0 } = account || {}
  const growth     = starting_balance > 0 ? ((current_balance - starting_balance) / starting_balance) * 100 : 0
  const growthUp   = growth > 0
  const growthDown = growth < 0

  const fadeUp = (delay = 0) => reduced
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.36, delay, ease: 'easeOut' } }

  return (
    <motion.header {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } })}>
      {/* ── Hero band ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-b-[28px] mb-5 px-6 py-7 sm:px-10 sm:py-8"
           style={{ background: 'linear-gradient(135deg, #0E2A47 0%, #0A3A6B 60%, #0D4A8A 100%)' }}>

        {/* subtle inner glow rings */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[.12]"
             style={{ background: 'radial-gradient(circle, #2BB5EF, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-[.08]"
             style={{ background: 'radial-gradient(circle, #FFD43B, transparent 70%)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* left: logo + balance */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl grid place-items-center bg-white/15 ring-1 ring-white/25 shrink-0">
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="white"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l5-5 4 3 6-7" /><path d="M14 4h5v5" />
                </svg>
              </div>
              <span className="font-display font-[700] text-[15px] text-white/80 tracking-tight">Risk Desk</span>
            </div>

            <motion.div {...fadeUp(0.05)} className="flex items-end gap-3 flex-wrap">
              <span className="hero-num font-[800] text-[46px] sm:text-[58px] leading-none text-white tnum">
                <AnimatedMoney value={current_balance} />
              </span>
              {growth !== 0 && (
                <motion.span
                  key={growthUp ? 'up' : 'down'}
                  initial={reduced ? {} : { scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className={`mb-1.5 inline-flex items-center gap-1 px-3 py-1 rounded-full
                              font-sans font-[700] text-[13px]
                              ${growthUp ? 'bg-yellow text-ink' : 'bg-red-400/30 text-red-200'}`}>
                  {growthUp ? '▲' : '▼'} {fmt(Math.abs(growth), 1)}%
                </motion.span>
              )}
            </motion.div>
            <p className="text-white/50 text-[12.5px] font-sans m-0">
              Started at {money(starting_balance)}
            </p>
          </div>

          {/* right: supporting stats + settings */}
          <motion.div {...fadeUp(0.1)} className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:justify-end">
            <HeroStat label="Trades"   value={stats.count}        />
            <HeroStat label="Win rate" value={stats.winRateText}  highlight={stats.count > 0} />
            <HeroStat label="Net P&L"  value={stats.netText}
                      positive={stats.netPositive} negative={stats.netNegative} />

            <button onClick={onOpenSettings} aria-label="Account settings"
              className="w-10 h-10 rounded-full ring-1 ring-white/25 bg-white/10 grid place-items-center
                         text-white/70 cursor-pointer transition hover:bg-white/20 hover:text-white
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E2A47]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}

function HeroStat({ label, value, highlight, positive, negative }) {
  return (
    <div className="flex flex-col items-start sm:items-end">
      <span className="text-[10.5px] font-[600] uppercase tracking-wider text-white/45">{label}</span>
      <span className={`hero-num font-[700] text-[17px] tnum leading-tight
                        ${positive ? 'text-green-300' : negative ? 'text-red-300' : highlight ? 'text-green-300' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}
