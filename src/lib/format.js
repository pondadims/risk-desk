export function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function money(n) {
  if (!Number.isFinite(n)) return '$0.00'
  const sign = n < 0 ? '-' : ''
  return sign + '$' + fmt(Math.abs(n), 2)
}
