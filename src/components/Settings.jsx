import { useState, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export default function Settings({ account, onSave, onClose }) {
  const reduced = useReducedMotion()
  const [startingBalance, setStartingBalance] = useState(String(account?.starting_balance ?? ''))
  const [defaultRisk, setDefaultRisk]         = useState(String(account?.default_risk_pct ?? '2'))
  const firstInputRef = useRef(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function save(e) {
    e.preventDefault()
    const sb = parseFloat(startingBalance)
    const dr = parseFloat(defaultRisk)
    if (!Number.isFinite(sb) || sb < 0) return
    if (!Number.isFinite(dr) || dr <= 0 || dr > 100) return
    onSave({ starting_balance: sb, default_risk_pct: dr })
  }

  return (
    <>
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
        onClick={onClose} aria-hidden="true" />

      {/* sheet — bottom on mobile, centered modal on md+ */}
      <motion.div
        role="dialog" aria-modal="true" aria-label="Account settings"
        initial={reduced
          ? { opacity: 0 }
          : { opacity: 0, y: '100%' }}
        animate={reduced
          ? { opacity: 1 }
          : { opacity: 1, y: 0 }}
        exit={reduced
          ? { opacity: 0 }
          : { opacity: 0, y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed z-50
                   bottom-0 left-0 right-0 rounded-t-[24px]
                   md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                   md:w-full md:max-w-sm md:rounded-[24px]
                   bg-card border border-line shadow-cardHover">

        {/* drag handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-line" />
        </div>

        <div className="px-6 pt-5 pb-6 md:py-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-[700] text-[17px] text-ink2 m-0">Account settings</h3>
            <button onClick={onClose} aria-label="Close settings"
              className="w-8 h-8 rounded-full border border-line text-muted flex items-center justify-center
                         cursor-pointer transition hover:border-red-200 hover:text-loss hover:bg-lossSoft
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="s-balance" className="text-[11px] font-[600] uppercase tracking-wide text-muted">
                Starting balance
              </label>
              <div className="relative">
                <input id="s-balance" ref={firstInputRef}
                  type="number" step="any" value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full h-11 bg-paper border border-line rounded-[12px] text-ink font-sans font-[600] text-[15px]
                             px-3.5 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20" />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-[12px] pointer-events-none">USDT</span>
              </div>
              <p className="text-[11.5px] text-muted/70 m-0 leading-relaxed">
                Baseline for growth % and compounding. Set this once to match your account.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="s-risk" className="text-[11px] font-[600] uppercase tracking-wide text-muted">
                Default risk per trade
              </label>
              <div className="relative">
                <input id="s-risk"
                  type="number" step="0.1" min="0.1" max="100" value={defaultRisk}
                  onChange={(e) => setDefaultRisk(e.target.value)}
                  className="w-full h-11 bg-paper border border-line rounded-[12px] text-ink font-sans font-[600] text-[15px]
                             px-3.5 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/20" />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-[12px] pointer-events-none">%</span>
              </div>
              <p className="text-[11.5px] text-muted/70 m-0 leading-relaxed">
                Pre-fills the risk field in the calculator. Override it per trade any time.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <motion.button type="button" onClick={onClose}
                whileTap={reduced ? {} : { scale: 0.97 }}
                className="flex-1 h-11 rounded-full border border-line font-sans font-[600] text-[14px]
                           text-muted bg-paper cursor-pointer transition hover:border-ink/30 hover:text-ink
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">
                Cancel
              </motion.button>
              <motion.button type="submit"
                whileTap={reduced ? {} : { scale: 0.97 }}
                className="flex-1 h-11 rounded-full font-sans font-[700] text-[14px]
                           bg-yellow text-ink cursor-pointer transition hover:bg-yellowDeep
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2">
                Save
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}
