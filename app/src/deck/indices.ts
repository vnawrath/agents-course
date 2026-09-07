// Deterministic fractional index keys. tldraw's getIndices() jitters keys randomly,
// which would change the generated JSON (and the deck hash) on every run.
import type { IndexKey } from '@tldraw/utils'

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** n keys in ascending order starting at 'a1' (like tldraw), no randomness. */
export function stableIndices(n: number): IndexKey[] {
  const keys: IndexKey[] = []
  for (let i = 0; i < n; i++) {
    let key: string
    if (i < DIGITS.length - 1) key = `a${DIGITS[i + 1]}`
    else {
      const j = i - (DIGITS.length - 1)
      if (j >= DIGITS.length * DIGITS.length) throw new Error('too many shapes on one slide')
      key = `b${DIGITS[Math.floor(j / DIGITS.length)]}${DIGITS[j % DIGITS.length]}`
    }
    if (!/^[a-z][0-9A-Za-z]+$/.test(key)) throw new Error(`bad index key ${key}`) // the schema validator is the real gate
    keys.push(key as IndexKey)
  }
  return keys
}
