import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { fmt } from '../lib/format.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const VERDICT_CFG = {
  safe:   { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', icon: '✓', label: 'Safe',   copy: 'Your stop triggers first — comfortable buffer at this leverage.' },
  tight:  { bg: '#FEF9C3', text: '#A16207', border: '#FDE047', icon: '!', label: 'Tight',  copy: 'Stop still triggers first, but only just. Consider reducing leverage.' },
  danger: { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5', icon: '✕', label: 'Danger', copy: 'Liquidation hits before your stop. You lose full margin. Lower the leverage.' },
}

function Marker({ pct, color, label, value, reduced }) {
  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex flex-col items-center"
      animate={{ left: pct + '%' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 26 }}>
      {/* bubble */}
      <div className="absolute bottom-[calc(100%+8px)] whitespace-nowrap font-sans text-[10px] font-[600]
                      px-2 py-1 rounded-[7px] text-white shadow-sm"
           style={{ background: color }}>
        {label}{value ? ` ${value}` : ''}
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2 h-2 rotate-45"
              style={{ background: color }} />
      </div>
      {/* tick */}
      <div className="w-0.5 h-7 rounded-sm" style={{ background: color }} />
    </motion.div>
  )
}

export default function LiquidationGauge({ slPct, liqMovePct, verdict, leverage }) {
  const reduced = useReducedMotion()
  const span   = Math.max(liqMovePct, slPct, 1) * 1.28
  const slPos  = clamp((slPct      / span) * 100, 3, 97)
  const liqPos = clamp((liqMovePct / span) * 100, 3, 97)
  const v = VERDICT_CFG[verdict] || VERDICT_CFG.safe

  return (
    <div className="bg-paper border border-line rounded-[16px] px-4 py-4">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-[600] uppercase tracking-wide text-muted">
          Liquidation vs stop
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={verdict}
            initial={reduced ? {} : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? {} : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-[600]"
            style={{ background: v.bg, color: v.text, borderColor: v.border }}>
            {v.icon} {v.label}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* track */}
      <div className="relative h-3 rounded-full mx-2 mt-9 mb-2"
           style={{ background: 'linear-gradient(90deg, #bbf7d0 0%, #fef08a 50%, #fecaca 100%)' }}>
        <Marker pct={0}      color="#94A3B8" label="Entry" value=""                        reduced={reduced} />
        <Marker pct={slPos}  color="#DC2626" label="Stop"  value={fmt(slPct, 1) + '%'}     reduced={reduced} />
        <Marker pct={liqPos} color="#0A78BE" label="Liq"   value={fmt(liqMovePct, 1) + '%'} reduced={reduced} />
      </div>

      <p className="text-[12px] text-muted leading-relaxed mt-4 mb-0">{v.copy}</p>
    </div>
  )
}
