/**
 * Tolerant locale-aware number parser.
 *
 * Handles the class of bug where a user types "105.000" meaning 105,000
 * (European thousands separator) and the app silently reads it as 105.
 *
 * Decision tree:
 *   No separators           → parseFloat directly
 *   Both ',' and '.' present → whichever comes LAST is the decimal point
 *   Only one separator type, appears MULTIPLE times → thousands separator
 *   Only one separator, appears ONCE:
 *     exactly 3 digits follow it → thousands separator  ("105.000" → 105000)
 *     any other digit count      → decimal point        ("0.1904"  → 0.1904)
 */
export function parseNumber(raw) {
  if (raw === null || raw === undefined) return NaN
  const s = String(raw).trim().replace(/\s/g, '')
  if (s === '') return NaN

  const hasDot   = s.includes('.')
  const hasComma = s.includes(',')

  // No separators — plain number
  if (!hasDot && !hasComma) {
    const n = parseFloat(s)
    return isNaN(n) ? NaN : n
  }

  // Both separators present — last one is the decimal
  if (hasDot && hasComma) {
    const lastDot   = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    let normalized
    if (lastDot > lastComma) {
      // "1,234.56" — comma = thousands, dot = decimal
      normalized = s.replace(/,/g, '')
    } else {
      // "1.234,56" — dot = thousands, comma = decimal
      normalized = s.replace(/\./g, '').replace(',', '.')
    }
    const n = parseFloat(normalized)
    return isNaN(n) ? NaN : n
  }

  // Only dots
  if (hasDot) {
    const parts = s.split('.')
    if (parts.length > 2) {
      // "1.234.567" — multiple dots → all are thousands separators
      const n = parseFloat(parts.join(''))
      return isNaN(n) ? NaN : n
    }
    // Single dot — check the digits after it
    const afterDot = parts[1] ?? ''
    if (afterDot.length === 3 && /^\d+$/.test(afterDot) && /^\d+$/.test(parts[0])) {
      // "105.000" → 105000, but "1.500" is ambiguous; we treat 3-digit as thousands
      const n = parseFloat(parts[0] + afterDot)
      return isNaN(n) ? NaN : n
    }
    // "0.1904", "12.5", "1.50" → decimal point
    const n = parseFloat(s)
    return isNaN(n) ? NaN : n
  }

  // Only commas
  if (hasComma) {
    const parts = s.split(',')
    if (parts.length > 2) {
      // "1,234,567" — multiple commas → all are thousands separators
      const n = parseFloat(parts.join(''))
      return isNaN(n) ? NaN : n
    }
    // Single comma — same heuristic as single dot
    const afterComma = parts[1] ?? ''
    if (afterComma.length === 3 && /^\d+$/.test(afterComma) && /^\d+$/.test(parts[0])) {
      // "105,000" → 105000
      const n = parseFloat(parts[0] + afterComma)
      return isNaN(n) ? NaN : n
    }
    // "0,5", "1,50" → decimal
    const n = parseFloat(parts[0] + '.' + afterComma)
    return isNaN(n) ? NaN : n
  }

  return NaN
}
