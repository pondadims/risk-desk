import { describe, it, expect } from 'vitest'
import { parseNumber } from './parseNumber.js'

describe('parseNumber — thousands separator detection', () => {
  it('"105.000"  → 105000  (dot as thousands, 3 digits after)', () => expect(parseNumber('105.000')).toBe(105000))
  it('"105,000"  → 105000  (comma as thousands, 3 digits after)', () => expect(parseNumber('105,000')).toBe(105000))
  it('"1,234.56" → 1234.56 (comma thousands, dot decimal)', () => expect(parseNumber('1,234.56')).toBe(1234.56))
  it('"1.234,56" → 1234.56 (dot thousands, comma decimal)', () => expect(parseNumber('1.234,56')).toBe(1234.56))
  it('"1,234,567.89" → 1234567.89', () => expect(parseNumber('1,234,567.89')).toBe(1234567.89))
  it('"1.234.567,89" → 1234567.89', () => expect(parseNumber('1.234.567,89')).toBe(1234567.89))
  it('"1.234.567"  → 1234567 (multiple dots, all thousands)', () => expect(parseNumber('1.234.567')).toBe(1234567))
  it('"1,234,567"  → 1234567 (multiple commas, all thousands)', () => expect(parseNumber('1,234,567')).toBe(1234567))
})

describe('parseNumber — decimal point detection', () => {
  it('"0.1904"  → 0.1904  (dot decimal, not 3 digits after)', () => expect(parseNumber('0.1904')).toBe(0.1904))
  it('"0,1904"  → 0.1904  (comma decimal, not 3 digits after)', () => expect(parseNumber('0.1904')).toBe(0.1904))
  it('"0,5"     → 0.5', () => expect(parseNumber('0,5')).toBe(0.5))
  it('"12.5"    → 12.5', () => expect(parseNumber('12.5')).toBe(12.5))
  it('"1.50"    → 1.5  (2 digits after dot → decimal)', () => expect(parseNumber('1.50')).toBe(1.5))
  it('"1.5000"  → 1.5  (4 digits after dot → decimal)', () => expect(parseNumber('1.5000')).toBe(1.5))
  it('"0.19"    → 0.19', () => expect(parseNumber('0.19')).toBe(0.19))
})

describe('parseNumber — plain integers', () => {
  it('"105000"   → 105000', () => expect(parseNumber('105000')).toBe(105000))
  it('"0"        → 0',       () => expect(parseNumber('0')).toBe(0))
  it('"42"       → 42',      () => expect(parseNumber('42')).toBe(42))
})

describe('parseNumber — whitespace stripping', () => {
  it('" 1 000 "  → 1000 (spaces as grouping)', () => expect(parseNumber(' 1 000 ')).toBe(1000))
  it('"  105.000  " → 105000', () => expect(parseNumber('  105.000  ')).toBe(105000))
})

describe('parseNumber — invalid inputs', () => {
  it('"abc"  → NaN', () => expect(parseNumber('abc')).toBeNaN())
  it('""     → NaN', () => expect(parseNumber('')).toBeNaN())
  it('null   → NaN', () => expect(parseNumber(null)).toBeNaN())
  it('undefined → NaN', () => expect(parseNumber(undefined)).toBeNaN())
})

describe('parseNumber — the original bug case', () => {
  it('BTC entry "105.000" must parse as 105000, not 105', () => {
    expect(parseNumber('105.000')).toBe(105000)
    expect(parseNumber('105.000')).not.toBe(105)
  })
})
