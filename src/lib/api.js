// Storage layer. Flips between localStorage (local) and Postgres via /api (api mode).
// Both expose the same async interface so App.jsx never knows which is active.

const MODE = import.meta.env.VITE_STORAGE || 'local'
const LKEY = 'riskdesk_trades_v1'
const LACCT = 'riskdesk_account_v1'

function localLoadTrades() {
  try { return JSON.parse(localStorage.getItem(LKEY)) || [] } catch { return [] }
}
function localSaveTrades(arr) {
  try { localStorage.setItem(LKEY, JSON.stringify(arr)) } catch {}
}
function localLoadAccount() {
  try {
    const raw = localStorage.getItem(LACCT)
    return raw ? JSON.parse(raw) : { id: 1, starting_balance: 0, default_risk_pct: 2, current_balance: 0 }
  } catch { return { id: 1, starting_balance: 0, default_risk_pct: 2, current_balance: 0 } }
}
function localSaveAccount(acct) {
  try { localStorage.setItem(LACCT, JSON.stringify(acct)) } catch {}
}

async function jsonOrThrow(res, msg) {
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j.error || '' } catch {}
    throw new Error((msg + (detail ? ': ' + detail : '')) + ' (' + res.status + ')')
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  mode: MODE,

  async getAccount() {
    if (MODE === 'local') return localLoadAccount()
    return jsonOrThrow(await fetch('/api/account'), 'Could not load account')
  },

  async patchAccount(patch) {
    if (MODE === 'local') {
      const acct = { ...localLoadAccount(), ...patch }
      localSaveAccount(acct)
      return acct
    }
    return jsonOrThrow(
      await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }), 'Could not update account')
  },

  async list() {
    if (MODE === 'local') return localLoadTrades()
    return jsonOrThrow(await fetch('/api/trades'), 'Could not load trades')
  },

  async create(trade) {
    if (MODE === 'local') {
      const arr = localLoadTrades()
      const row = { ...trade, id: Date.now(), created_at: new Date().toISOString() }
      arr.unshift(row); localSaveTrades(arr); return row
    }
    return jsonOrThrow(
      await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade),
      }), 'Could not save trade')
  },

  async update(id, patch) {
    if (MODE === 'local') {
      const arr = localLoadTrades()
      const i = arr.findIndex((t) => t.id === id)
      if (i >= 0) { arr[i] = { ...arr[i], ...patch }; localSaveTrades(arr); return arr[i] }
      return null
    }
    return jsonOrThrow(
      await fetch('/api/trades/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }), 'Could not update trade')
  },

  async remove(id) {
    if (MODE === 'local') {
      localSaveTrades(localLoadTrades().filter((t) => t.id !== id)); return
    }
    return jsonOrThrow(await fetch('/api/trades/' + id, { method: 'DELETE' }), 'Could not delete trade')
  },
}
