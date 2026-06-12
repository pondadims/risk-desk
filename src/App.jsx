import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { api } from './lib/api.js'
import { deriveStats } from './lib/stats.js'
import Header from './components/Header.jsx'
import Calculator from './components/Calculator.jsx'
import Journal from './components/Journal.jsx'
import Settings from './components/Settings.jsx'

const MODE = import.meta.env.VITE_STORAGE || 'local'

function Toast({ msg, icon, show }) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status" aria-live="polite"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50
                     flex items-center gap-2.5 bg-ink text-white font-sans font-semibold text-[13px]
                     px-5 py-3 rounded-full shadow-hero pointer-events-none">
          <span className="text-[15px]">{icon}</span>
          <span>{msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function deriveBalance(startingBalance, trades) {
  let pl = 0
  for (const t of trades) {
    const v = parseFloat(t.pl)
    if (Number.isFinite(v)) pl += v
  }
  return startingBalance + pl
}

export default function App() {
  const [trades, setTrades]       = useState([])
  const [account, setAccount]     = useState({ starting_balance: 0, default_risk_pct: 2, current_balance: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast]         = useState({ msg: '', icon: '✓', show: false })
  const toastTimer = useRef()

  const notify = useCallback((msg, icon = '✓') => {
    setToast({ msg, icon, show: true })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200)
  }, [])

  const refreshAccount = useCallback(async (currentTrades) => {
    if (MODE === 'api') {
      try { setAccount(await api.getAccount()) }
      catch (e) { notify(e.message, '⚠') }
    } else {
      setAccount((prev) => ({
        ...prev,
        current_balance: deriveBalance(prev.starting_balance, currentTrades ?? trades),
      }))
    }
  }, [trades, notify])

  useEffect(() => {
    const load = async () => {
      try {
        const [tradeList, acct] = await Promise.all([
          api.list(),
          MODE === 'api' ? api.getAccount() : Promise.resolve(null),
        ])
        setTrades(tradeList)
        if (acct) setAccount(acct)
        else setAccount((p) => ({ ...p, current_balance: deriveBalance(p.starting_balance, tradeList) }))
      } catch (e) { notify(e.message, '⚠') }
    }
    load()
  }, [notify])

  const stats = useMemo(() => deriveStats(trades), [trades])

  const handleLog = useCallback(async (trade) => {
    if (!trade) return notify('Fill entry and stop loss first', '⚠')
    try {
      const row = await api.create(trade)
      const next = [row, ...trades]
      setTrades(next)
      await refreshAccount(next)
      notify('Trade logged', '✓')
    } catch (e) { notify(e.message, '⚠') }
  }, [trades, notify, refreshAccount])

  const handleCycle = useCallback(async (id, status) => {
    setTrades((p) => p.map((t) => t.id === id ? { ...t, status } : t))
    try { await api.update(id, { status }) } catch (e) { notify(e.message, '⚠') }
  }, [notify])

  const handlePL = useCallback(async (id, raw) => {
    const v  = raw.trim()
    const pl = v === '' ? '' : Number.isFinite(parseFloat(v)) ? parseFloat(v) : ''
    const next = trades.map((t) => t.id === id ? { ...t, pl } : t)
    setTrades(next)
    try { await api.update(id, { pl }); await refreshAccount(next) }
    catch (e) { notify(e.message, '⚠') }
  }, [trades, notify, refreshAccount])

  const handleDelete = useCallback(async (id) => {
    const next = trades.filter((t) => t.id !== id)
    setTrades(next)
    try { await api.remove(id); await refreshAccount(next) }
    catch (e) { notify(e.message, '⚠') }
  }, [trades, notify, refreshAccount])

  const handleClear = useCallback(async () => {
    if (!trades.length) return notify('Journal is already empty', '⚠')
    if (!confirm('Delete all logged trades? This cannot be undone.')) return
    const ids = trades.map((t) => t.id)
    setTrades([])
    try { await Promise.all(ids.map((id) => api.remove(id))); await refreshAccount([]); notify('Journal cleared', '✓') }
    catch (e) { notify(e.message, '⚠') }
  }, [trades, notify, refreshAccount])

  const handleSaveSettings = useCallback(async (patch) => {
    if (MODE === 'api') {
      try { setAccount(await api.patchAccount(patch)); notify('Settings saved', '✓') }
      catch (e) { notify(e.message, '⚠') }
    } else {
      setAccount((p) => {
        const n = { ...p, ...patch }
        n.current_balance = deriveBalance(n.starting_balance, trades)
        return n
      })
      notify('Settings saved', '✓')
    }
    setShowSettings(false)
  }, [trades, notify])

  return (
    <div className="min-h-screen bg-ink">
      <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-5 sm:pt-6">
          <Header account={account} stats={stats} onOpenSettings={() => setShowSettings(true)} />
        </div>

        <div className="flex flex-col gap-5 pb-10">
          <Calculator account={account} onLog={handleLog} />
          <Journal
            trades={trades} stats={stats}
            onCycle={handleCycle} onPL={handlePL}
            onDelete={handleDelete} onClear={handleClear}
            notify={notify}
          />
        </div>

        <footer className="text-center text-muted text-[12px] leading-relaxed pb-6">
          <p className="m-0">Risk 1–2% per trade · size from your stop · leverage last · liquidation must sit beyond your stop.</p>
          <p className="m-0 mt-1 opacity-60">Not financial advice — a tool for math and discipline.</p>
          {MODE === 'local' && (
            <p className="m-0 mt-1 opacity-50">
              Saving locally · set <code className="font-mono text-[11px]">VITE_STORAGE=api</code> for Postgres persistence
            </p>
          )}
        </footer>
      </div>

      <AnimatePresence>
        {showSettings && (
          <Settings account={account} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      <Toast {...toast} />
    </div>
  )
}
