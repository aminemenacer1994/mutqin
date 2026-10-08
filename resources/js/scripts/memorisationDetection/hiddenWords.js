/**
 * Deterministic hidden-word selection for the AI memorisation test.
 * Percentage = how much of the ayah is hidden (25% easier … 100% hardest).
 */

/** Hide percentages (higher = fewer words shown). 10 → 90% shown. */
export const DIFFICULTY_PERCENTS = Object.freeze([10, 25, 50, 75, 100])
export const DEFAULT_DIFFICULTY_PERCENT = 100
export const AMD_DIFFICULTY_PREF_KEY = 'mutqin.amd.hidePercent'

/**
 * @param {unknown} value
 * @returns {10|25|50|75|100}
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
    // Only settled recall (green/amber) auto-finishes. Red must not end the
    // check — continue-and-review lets the learner keep going after a mistake.
    return status === 'correct' || status === 'partial'
  })
}

/**
 * Statuses that mean the final target word was actually heard.
 * Soft omitted/skipped during a pause must never count — that cut slow tajweed short.
 */
const SESSION_PASSAGE_HEARD_STATUSES = new Set([
  'correct',
  'partial',
  'incorrect',
  'uncertain',
])

/** Statuses that count as attempted for a full-range settle check. */
const SESSION_PASSAGE_SETTLED_STATUSES = new Set([
  'correct',
  'partial',
  'incorrect',
  'omitted',
  'skipped',
  'uncertain',
])

/**
 * True when the final word of the session range has been heard.
 * Mid-range live skip holes often stay `pending` (UNASSESSED) until finalize —
 * those must not block auto-stop once the learner reaches the end.
 * @param {Array<{ status?: string }>} liveWords
 */
export function hasReachedSessionPassageEnd(liveWords = []) {
  const words = Array.isArray(liveWords) ? liveWords : []
  if (!words.length) return false
  const lastStatus = String(words[words.length - 1]?.status || '').toLowerCase()
  return SESSION_PASSAGE_HEARD_STATUSES.has(lastStatus)
}

/**
 * True when the session passage is ready to auto-stop recording.
 * Requires the final word to have been heard (green/amber/red/uncertain).
 * Mid-range live skip holes may still be `pending` — that must not block stop.
 * Soft omitted/skipped on the last word alone never counts (pause grace).
 * @param {Array<{ status?: string }>} liveWords
 */
export function areAllSessionWordsSettled(liveWords = []) {
  const words = Array.isArray(liveWords) ? liveWords : []
  if (!words.length) return false
  if (!hasReachedSessionPassageEnd(words)) return false
  // Last word heard. Earlier slots may be settled or still pending skip holes.
  return words.every((word, index) => {
    if (index === words.length - 1) return true
    const status = String(word?.status || '').toLowerCase()
    return SESSION_PASSAGE_SETTLED_STATUSES.has(status) || status === 'pending'
  })
}

/**
 * Read persisted difficulty preference (browser only).
 * @returns {10|25|50|75|100}
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
