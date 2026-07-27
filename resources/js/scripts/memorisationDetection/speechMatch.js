/**
 * Arabic speech matching helpers for the memorisation test.
 * Normalisation is for comparison only — never mutate display strings.
 */

import {
  normalizeArabicForRecitation,
  getRecitationWordSimilarity,
  stripArabicDefiniteArticle,
} from '../engine/recitation_analysis.js'

export const DEFAULT_FORWARD_WINDOW = 4
export const DEFAULT_MATCH_THRESHOLD = 0.78

/**
 * Safe comparison form of Arabic text (does not alter display source).
 * @param {string} text
 */
export function normalizeForMatch(text) {
  return normalizeArabicForRecitation(text)
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeForMatch(text) {
  const normalized = normalizeForMatch(text)
  return normalized ? normalized.split(/\s+/).filter(Boolean) : []
}

/**
 * Soft equality for STT vs Qur'an tokens.
 * @param {string} heard
 * @param {string} expected
 * @param {number} [threshold]
 */
export function tokensMatch(heard, expected, threshold = DEFAULT_MATCH_THRESHOLD) {
  const a = normalizeForMatch(heard)
  const b = normalizeForMatch(expected)
  if (!a || !b) return false
  if (a === b) return true
  if (stripArabicDefiniteArticle(a) === stripArabicDefiniteArticle(b)) return true
  return getRecitationWordSimilarity(a, b) >= threshold
}

/**
 * Drop duplicate interim tokens that already appear at the end of the committed stream.
 * Prevents double-advancing the cursor on interim→final echoes.
 * @param {string[]} committed
 * @param {string[]} interim
 * @returns {string[]}
 */
export function dedupeInterimAgainstCommitted(committed = [], interim = []) {
  const base = Array.isArray(committed) ? committed.map(normalizeForMatch).filter(Boolean) : []
  const next = Array.isArray(interim) ? interim.map(normalizeForMatch).filter(Boolean) : []
  if (!next.length) return []
  if (!base.length) return next

  let overlap = 0
  const max = Math.min(base.length, next.length)
  for (let size = max; size >= 1; size -= 1) {
    let ok = true
    for (let i = 0; i < size; i += 1) {
      if (base[base.length - size + i] !== next[i]) {
        ok = false
        break
      }
    }
    if (ok) {
      overlap = size
      break
    }
  }
  return next.slice(overlap)
}

/**
 * Sequential match with a small forward window.
 * Out-of-order later phrases cannot reveal earlier gaps.
 *
 * @param {{
 *   expectedTokens: string[],
 *   heardTokens: string[],
 *   cursor?: number,
 *   windowSize?: number,
 *   threshold?: number,
 * }} input
 * @returns {{ cursor: number, matchedIndexes: number[] }}
 */
export function matchSequentialTokens({
  expectedTokens = [],
  heardTokens = [],
  cursor = 0,
  windowSize = DEFAULT_FORWARD_WINDOW,
  threshold = DEFAULT_MATCH_THRESHOLD,
} = {}) {
  const expected = Array.isArray(expectedTokens) ? expectedTokens : []
  const heard = Array.isArray(heardTokens) ? heardTokens : []
  let pos = Math.max(0, Math.min(Number(cursor) || 0, expected.length))
  const matchedIndexes = []
  const window = Math.max(1, Math.floor(Number(windowSize) || DEFAULT_FORWARD_WINDOW))

  for (const token of heard) {
    if (pos >= expected.length) break
    let foundAt = -1
    const limit = Math.min(expected.length, pos + window)
    for (let i = pos; i < limit; i += 1) {
      if (tokensMatch(token, expected[i], threshold)) {
        foundAt = i
        break
      }
    }
    if (foundAt < 0) continue
    // Fill only the matched index — do not auto-reveal skipped gaps.
    matchedIndexes.push(foundAt)
    pos = foundAt + 1
  }

  return { cursor: pos, matchedIndexes }
}

/**
 * Apply sequential matches onto a live-word status list without mutating display text.
 * Only marks matched indexes as correct; never marks by time.
 *
 * @param {Array<object>} liveWords
 * @param {number[]} matchedIndexes
 * @returns {Array<object>}
 */
export function applyMatchedIndexesToLiveWords(liveWords = [], matchedIndexes = []) {
  if (!Array.isArray(liveWords) || !liveWords.length) return []
  if (!Array.isArray(matchedIndexes) || !matchedIndexes.length) return liveWords.slice()

  const next = liveWords.slice()
  const seen = new Set()
  for (const index of matchedIndexes) {
    const i = Number(index)
    if (!Number.isFinite(i) || i < 0 || i >= next.length || seen.has(i)) continue
    seen.add(i)
    const word = next[i] || {}
    if (String(word.status || '').toLowerCase() === 'correct') continue
    next[i] = {
      ...word,
      status: 'correct',
      note: word.note || '',
    }
  }
  return next
}
