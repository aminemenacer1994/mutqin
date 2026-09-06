import { normalizeArabicForRecitation } from '../engine/recitation_analysis.js'
import { matchSequentialTokens, tokenizeForMatch, tokensMatch } from '../memorisationDetection/speechMatch.js'

export const ASK_MUTQIN_MIN_WORDS = 3
export const ASK_MUTQIN_UNIQUE_MIN_WORDS = 2
export const ASK_MUTQIN_STRONG_SCORE = 0.42
export const ASK_MUTQIN_UNIQUE_SCORE = 0.68
export const ASK_MUTQIN_AMBIGUOUS_GAP = 0.02
export const ASK_MUTQIN_TOKEN_THRESHOLD = 0.58

const BASMALA_NORMALIZED = normalizeArabicForRecitation('بسم الله الرحمن الرحيم')
const BASMALA_WORDS = BASMALA_NORMALIZED.split(/\s+/).filter(Boolean)
const SHORT_PARTICLES = new Set(['لا', 'ما', 'من', 'في', 'عن', 'ان', 'ان', 'او', 'لم', 'لن', 'قد', 'بل'])

function isMeaningfulWord(word) {
  const value = String(word || '').trim()
  if (!value) return false
  if (value.length >= 2) return true
  return SHORT_PARTICLES.has(normalizeArabicForRecitation(value))
}

export function tokenizeHeardArabic(text) {
  return tokenizeForMatch(text).filter(isMeaningfulWord)
}

export function stripLeadingBasmalaTokens(words = []) {
  const list = Array.isArray(words) ? words.slice() : []
  if (list.length < BASMALA_WORDS.length) return list
  const leading = list.slice(0, BASMALA_WORDS.length)
  const isBasmala = leading.every((word, index) => tokensMatch(word, BASMALA_WORDS[index], ASK_MUTQIN_TOKEN_THRESHOLD))
  return isBasmala ? list.slice(BASMALA_WORDS.length) : list
}

export function scoreAyahPrefix(heardWords, ayahWords) {
  const heard = Array.isArray(heardWords) ? heardWords.filter(Boolean) : []
  const expected = Array.isArray(ayahWords) ? ayahWords.filter(Boolean) : []
  if (!heard.length || !expected.length) return 0

  const window = Math.min(6, Math.max(3, heard.length + 2))
  const { matchedIndexes } = matchSequentialTokens({
    expectedTokens: expected.slice(0, heard.length + 4),
    heardTokens: heard,
    windowSize: window,
    threshold: ASK_MUTQIN_TOKEN_THRESHOLD,
  })
  if (!matchedIndexes.length) return 0

  const firstHeardMatches = tokensMatch(heard[0], expected[0], ASK_MUTQIN_TOKEN_THRESHOLD)
  const secondHeardMatches = heard.length > 1 && expected.length > 1
    && tokensMatch(heard[1], expected[1], ASK_MUTQIN_TOKEN_THRESHOLD)
  const coverage = matchedIndexes.length / heard.length
  const prefixBonus = (firstHeardMatches ? 0.14 : 0) + (secondHeardMatches ? 0.1 : 0)
  const startPenalty = matchedIndexes[0] === 0 ? 0 : 0.04
  return Math.max(0, Math.min(1, coverage + prefixBonus - startPenalty))
}

function rankCandidates(index, heardWords, surahFilter) {
  const scoped = Number(surahFilter) > 0
    ? index.filter((item) => Number(item.surah) === Number(surahFilter))
    : index

  const first = heardWords[0]
  const ranked = []
  for (const item of scoped) {
    const words = Array.isArray(item.words) ? item.words : []
    if (!words.length) continue
    // Cheap reject before the sequential scorer — keeps live matching responsive.
    if (first && !tokensMatch(first, words[0], Math.min(0.45, ASK_MUTQIN_TOKEN_THRESHOLD))) continue
    const score = scoreAyahPrefix(heardWords, words)
    if (score < 0.22) continue
    ranked.push({ ...item, score })
  }
  ranked.sort((a, b) => b.score - a.score || a.surah - b.surah || a.ayah - b.ayah)
  return ranked.slice(0, 8)
}

/**
 * Progressive prefix match. Prefer a confident unique hit after 3 words.
 * @returns {{ status: 'insufficient'|'ambiguous'|'matched', match?: object, candidates?: object[] }}
 */
export function matchHeardAyahPrefix(index, transcript, { surah = null } = {}) {
  const rawHeard = tokenizeHeardArabic(transcript)
  const heard = stripLeadingBasmalaTokens(rawHeard)
  if (!heard.length) return { status: 'insufficient', candidates: [] }

  const ranked = rankCandidates(Array.isArray(index) ? index : [], heard, surah)
  if (!ranked.length) {
    return heard.length >= 8 ? { status: 'ambiguous', candidates: [] } : { status: 'insufficient', candidates: [] }
  }

  const top = ranked[0]
  const runnerUp = ranked[1]
  const uniqueTop = !runnerUp || (top.score - runnerUp.score) >= ASK_MUTQIN_AMBIGUOUS_GAP
  const uniqueExact = ranked.filter((item) => item.score >= ASK_MUTQIN_UNIQUE_SCORE).length === 1
  const strongEnough = top.score >= ASK_MUTQIN_STRONG_SCORE

  // Two words only when clearly unique — never guess a common prefix.
  const uniqueEarly = heard.length >= ASK_MUTQIN_UNIQUE_MIN_WORDS
    && uniqueExact
    && uniqueTop
    && top.score >= ASK_MUTQIN_UNIQUE_SCORE

  // Three+ words: accept the best hit once it is strong enough.
  const threeWordHit = heard.length >= ASK_MUTQIN_MIN_WORDS && strongEnough && (
    uniqueTop
    || top.score >= 0.55
    || (top.score - (runnerUp?.score || 0)) >= 0.08
  )

  if (uniqueEarly || threeWordHit) {
    return { status: 'matched', match: top, candidates: ranked }
  }

  if (heard.length >= ASK_MUTQIN_MIN_WORDS && ranked.length > 1 && !uniqueTop) {
    return { status: 'ambiguous', candidates: ranked }
  }

  return { status: 'insufficient', candidates: ranked }
}
