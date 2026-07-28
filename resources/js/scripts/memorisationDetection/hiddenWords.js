/**
 * Deterministic hidden-word selection for the AI memorisation test.
 * Percentage = how much of the ayah is hidden (25% easier … 100% hardest).
 */

export const DIFFICULTY_PERCENTS = Object.freeze([25, 50, 75, 100])
export const DEFAULT_DIFFICULTY_PERCENT = 100
export const AMD_DIFFICULTY_PREF_KEY = 'mutqin.amd.hidePercent'

/**
 * @param {unknown} value
 * @returns {25|50|75|100}
 */
export function normaliseDifficultyPercent(value) {
  const n = Number(value)
  return DIFFICULTY_PERCENTS.includes(n) ? n : DEFAULT_DIFFICULTY_PERCENT
}

/**
 * Mulberry32 — stable seeded PRNG for predictable masks across rerenders.
 * @param {string|number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  let t = 0
  const raw = String(seed ?? 'mutqin')
  for (let i = 0; i < raw.length; i += 1) {
    t = (Math.imul(31, t) + raw.charCodeAt(i)) | 0
  }
  let state = t >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let r = state
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build a stable seed from session/range + difficulty.
 * @param {{
 *   sessionId?: string|number|null,
 *   surahNumber?: number|null,
 *   startAyah?: number|null,
 *   endAyah?: number|null,
 *   difficulty?: number|null,
 *   attempt?: number|null,
 * }} parts
 */
export function buildHiddenWordSeed(parts = {}) {
  return [
    parts.sessionId ?? 'guest',
    parts.surahNumber ?? 0,
    parts.startAyah ?? 0,
    parts.endAyah ?? 0,
    normaliseDifficultyPercent(parts.difficulty),
    parts.attempt ?? 0,
  ].join(':')
}

/**
 * Select global word indexes to hide.
 * @param {number} wordCount
 * @param {number} hidePercent
 * @param {string|number} seed
 * @returns {number[]} sorted unique indexes
 */
export function selectHiddenWordIndexes(wordCount, hidePercent = DEFAULT_DIFFICULTY_PERCENT, seed = 'mutqin') {
  const total = Math.max(0, Math.floor(Number(wordCount) || 0))
  if (!total) return []

  const pct = normaliseDifficultyPercent(hidePercent)
  const hideCount = pct === 100
    ? total
    : Math.max(1, Math.min(total, Math.round((total * pct) / 100)))

  const indexes = Array.from({ length: total }, (_, i) => i)
  const rng = createSeededRng(seed)
  const hidden = []

  while (hidden.length < hideCount && indexes.length) {
    const pick = Math.floor(rng() * indexes.length)
    hidden.push(indexes.splice(pick, 1)[0])
  }

  return hidden.sort((a, b) => a - b)
}

/**
 * @param {number[]} hiddenIndexes
 * @param {number} wordIndex
 */
export function isWordHidden(hiddenIndexes, wordIndex) {
  if (!Array.isArray(hiddenIndexes) || !hiddenIndexes.length) return false
  return hiddenIndexes.includes(Number(wordIndex))
}

/**
 * True when every hidden target is in a "correct" status.
 * Non-hidden words are ignored for completion.
 * @param {number[]} hiddenIndexes
 * @param {Array<{ status?: string }>} liveWords
 */
export function areAllHiddenWordsRevealed(hiddenIndexes, liveWords = []) {
  const list = Array.isArray(hiddenIndexes) ? hiddenIndexes : []
  if (!list.length) return false
  const words = Array.isArray(liveWords) ? liveWords : []
  return list.every((index) => {
    const status = String(words[index]?.status || '').toLowerCase()
    // Accept amber on a recalled slot so the final ayah can still complete.
    return status === 'correct' || status === 'partial'
  })
}

/**
 * Read persisted difficulty preference (browser only).
 * @returns {25|50|75|100}
 */
export function readStoredDifficultyPercent() {
  if (typeof localStorage === 'undefined') return DEFAULT_DIFFICULTY_PERCENT
  try {
    return normaliseDifficultyPercent(localStorage.getItem(AMD_DIFFICULTY_PREF_KEY))
  } catch {
    return DEFAULT_DIFFICULTY_PERCENT
  }
}

/**
 * @param {number} percent
 */
export function storeDifficultyPercent(percent) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(AMD_DIFFICULTY_PREF_KEY, String(normaliseDifficultyPercent(percent)))
  } catch { /* ignore */ }
}
