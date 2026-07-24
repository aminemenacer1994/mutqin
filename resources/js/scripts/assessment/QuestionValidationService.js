/**
 * Validates answers and builds distractors only from verified Qur'an tokens/phrases.
 * Never invents, rewrites, or verifies Qur'anic wording via generative AI.
 */

const TASHKEEL_RE = /[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED]/g
const NON_LETTER_RE = /[^\p{L}\p{N}\s]/gu

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeQuranText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(TASHKEEL_RE, '')
    .replace(NON_LETTER_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeVerifiedText(text) {
  const normalized = normalizeQuranText(text)
  if (!normalized) return []
  return normalized.split(' ').filter(Boolean)
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function textsMatch(a, b) {
  return normalizeQuranText(a) === normalizeQuranText(b)
}

/**
 * Split ayah into roughly equal phrase segments from verified tokens.
 * @param {string} text
 * @param {number} [parts=3]
 * @returns {string[]}
 */
export function splitIntoPhrases(text, parts = 3) {
  const tokens = tokenizeVerifiedText(text)
  if (!tokens.length) return []
  const segmentCount = Math.max(2, Math.min(parts, tokens.length))
  const size = Math.ceil(tokens.length / segmentCount)
  const phrases = []
  for (let i = 0; i < tokens.length; i += size) {
    phrases.push(tokens.slice(i, i + size).join(' '))
  }
  return phrases.filter(Boolean)
}

/**
 * Build unique distractors from other verified ayah texts in the pool.
 * Guarantees at most one correct option after validation.
 *
 * @param {{
 *   correct: string,
 *   poolTexts: string[],
 *   mode?: 'token'|'phrase'|'full',
 *   count?: number,
 *   rng?: () => number,
 * }} opts
 * @returns {{ options: string[], correctIndex: number, valid: boolean, reason?: string }}
 */
export function buildDistractors(opts = {}) {
  const correctRaw = String(opts.correct || '').trim()
  const correct = normalizeQuranText(correctRaw)
  const count = Math.max(2, Math.min(6, Number(opts.count) || 4))
  const mode = opts.mode || 'phrase'
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random
  const pool = Array.isArray(opts.poolTexts) ? opts.poolTexts : []

  if (!correct) {
    return { options: [], correctIndex: -1, valid: false, reason: 'empty_correct' }
  }

  /** @type {Set<string>} */
  const candidates = new Set()
  for (const raw of pool) {
    const text = String(raw || '')
    if (!text.trim()) continue
    if (mode === 'token') {
      for (const token of tokenizeVerifiedText(text)) {
        if (token && normalizeQuranText(token) !== correct) candidates.add(token)
      }
    } else if (mode === 'full') {
      const n = normalizeQuranText(text)
      if (n && n !== correct) candidates.add(text.trim())
    } else {
      for (const phrase of splitIntoPhrases(text, 3)) {
        if (normalizeQuranText(phrase) !== correct) candidates.add(phrase)
      }
    }
  }

  const distractors = []
  const list = [...candidates]
  while (distractors.length < count - 1 && list.length) {
    const idx = Math.floor(rng() * list.length)
    const [picked] = list.splice(idx, 1)
    const norm = normalizeQuranText(picked)
    if (!norm || norm === correct) continue
    if (distractors.some((d) => normalizeQuranText(d) === norm)) continue
    distractors.push(picked)
  }

  if (distractors.length < 1) {
    return { options: [], correctIndex: -1, valid: false, reason: 'insufficient_distractors' }
  }

  const options = [correctRaw || correct, ...distractors]
  // Shuffle
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]]
  }

  const validation = validateUniqueCorrect(options, correct)
  if (!validation.valid) {
    return { options: [], correctIndex: -1, valid: false, reason: validation.reason }
  }

  return {
    options,
    correctIndex: validation.correctIndex,
    valid: true,
  }
}

/**
 * Ensure exactly one option matches the correct answer after normalisation.
 * @param {string[]} options
 * @param {string} correctNormalized
 */
export function validateUniqueCorrect(options, correctNormalized) {
  const correct = normalizeQuranText(correctNormalized)
  if (!correct || !Array.isArray(options) || options.length < 2) {
    return { valid: false, correctIndex: -1, reason: 'invalid_options' }
  }

  const matches = []
  const seen = new Set()
  for (let i = 0; i < options.length; i += 1) {
    const n = normalizeQuranText(options[i])
    if (!n) {
      return { valid: false, correctIndex: -1, reason: 'empty_option' }
    }
    if (seen.has(n)) {
      return { valid: false, correctIndex: -1, reason: 'duplicate_option' }
    }
    seen.add(n)
    if (n === correct) matches.push(i)
  }

  if (matches.length !== 1) {
    return {
      valid: false,
      correctIndex: -1,
      reason: matches.length === 0 ? 'no_correct' : 'ambiguous_correct',
    }
  }

  return { valid: true, correctIndex: matches[0], reason: null }
}

/**
 * Score an open (typed) answer against verified text.
 * @param {string} answer
 * @param {string} expected
 * @returns {{ correct: boolean, partial: boolean, similarity: number }}
 */
export function scoreOpenAnswer(answer, expected) {
  const a = normalizeQuranText(answer)
  const e = normalizeQuranText(expected)
  if (!e) return { correct: false, partial: false, similarity: 0 }
  if (!a) return { correct: false, partial: false, similarity: 0 }
  if (a === e) return { correct: true, partial: false, similarity: 1 }

  const aTokens = a.split(' ').filter(Boolean)
  const eTokens = e.split(' ').filter(Boolean)
  if (!eTokens.length) return { correct: false, partial: false, similarity: 0 }

  let hit = 0
  const used = new Set()
  for (const token of aTokens) {
    const idx = eTokens.findIndex((t, i) => !used.has(i) && t === token)
    if (idx >= 0) {
      used.add(idx)
      hit += 1
    }
  }
  const similarity = hit / eTokens.length
  return {
    correct: similarity >= 0.92,
    partial: similarity >= 0.55 && similarity < 0.92,
    similarity: Math.round(similarity * 100) / 100,
  }
}

/**
 * Validate ordered segments against verified phrase order.
 * @param {string[]} answerOrder
 * @param {string[]} expectedOrder
 */
export function scoreOrdering(answerOrder, expectedOrder) {
  const expected = (expectedOrder || []).map(normalizeQuranText)
  const answer = (answerOrder || []).map(normalizeQuranText)
  if (!expected.length || answer.length !== expected.length) {
    return { correct: false, partial: false, similarity: 0 }
  }
  let correctPositions = 0
  for (let i = 0; i < expected.length; i += 1) {
    if (answer[i] === expected[i]) correctPositions += 1
  }
  const similarity = correctPositions / expected.length
  return {
    correct: similarity === 1,
    partial: similarity >= 0.5 && similarity < 1,
    similarity: Math.round(similarity * 100) / 100,
  }
}

/**
 * Hide a percentage of tokens for Mushaf-hide questions (from verified text only).
 * @param {string} text
 * @param {number} hidePercent 25|50|75|100
 * @param {() => number} [rng]
 */
export function buildMushafHidePrompt(text, hidePercent = 50, rng = Math.random) {
  const tokens = tokenizeVerifiedText(text)
  if (!tokens.length) {
    return { promptTokens: [], hiddenIndexes: [], hidePercent: 0, original: '' }
  }
  const pct = [25, 50, 75, 100].includes(Number(hidePercent)) ? Number(hidePercent) : 50
  const hideCount = pct === 100 ? tokens.length : Math.max(1, Math.round((tokens.length * pct) / 100))
  const indexes = tokens.map((_, i) => i)
  const hiddenIndexes = []
  while (hiddenIndexes.length < hideCount && indexes.length) {
    const idx = Math.floor(rng() * indexes.length)
    hiddenIndexes.push(indexes.splice(idx, 1)[0])
  }
  hiddenIndexes.sort((a, b) => a - b)
  const promptTokens = tokens.map((token, i) => (hiddenIndexes.includes(i) ? '____' : token))
  return {
    promptTokens,
    hiddenIndexes,
    hidePercent: pct,
    original: tokens.join(' '),
    hiddenTokens: hiddenIndexes.map((i) => tokens[i]),
  }
}

export const QuestionValidationService = {
  normalizeQuranText,
  tokenizeVerifiedText,
  textsMatch,
  splitIntoPhrases,
  buildDistractors,
  validateUniqueCorrect,
  scoreOpenAnswer,
  scoreOrdering,
  buildMushafHidePrompt,
}

export default QuestionValidationService
