import { normalizeArabicForRecitation } from '../engine/recitation_analysis.js'
import {
  matchSequentialTokens,
  normalizeForMatch,
  tokenizeForMatch,
  tokensMatch,
} from '../memorisationDetection/speechMatch.js'

export const ASK_MUTQIN_MIN_WORDS = 3
export const ASK_MUTQIN_UNIQUE_MIN_WORDS = 2
export const ASK_MUTQIN_STRONG_SCORE = 0.42
export const ASK_MUTQIN_UNIQUE_SCORE = 0.68
export const ASK_MUTQIN_AMBIGUOUS_GAP = 0.02
export const ASK_MUTQIN_TOKEN_THRESHOLD = 0.58
export const ASK_MUTQIN_MATCH_LIST_INITIAL = 5

export function isClearAyahMatchWinner(top, runnerUp) {
  if (!top) return false
  if (!runnerUp) return true
  if ((top.matched || 0) > (runnerUp.matched || 0)) return true
  if (top.score - runnerUp.score >= ASK_MUTQIN_AMBIGUOUS_GAP) return true
  if (top.score >= 0.55 && top.score - runnerUp.score >= 0.08) return true
  const spanWins = (top.matched || 0) >= 2
    && (top.matched || 0) > (runnerUp.matched || 0)
    && top.score >= 0.5
  return spanWins
}

export function filterViableAyahMatches(ranked = []) {
  const top = ranked[0]
  if (!top) return []
  const minScore = Math.max(ASK_MUTQIN_STRONG_SCORE, top.score - 0.06)
  return ranked.filter((item) => {
    if (item.score < minScore || (item.matched || 0) < 2) return false
    const matchedGap = (top.matched || 0) - (item.matched || 0)
    const scoreGap = top.score - item.score
    return matchedGap <= 1 && scoreGap <= 0.08
  })
}

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

function countOrderedMatches(phrase, expected, start) {
  const { matchedIndexes } = matchSequentialTokens({
    expectedTokens: expected.slice(start, start + phrase.length + 5),
    heardTokens: phrase,
    windowSize: Math.min(8, Math.max(4, phrase.length + 2)),
    threshold: ASK_MUTQIN_TOKEN_THRESHOLD,
  })
  return matchedIndexes.length
}

function alignPhrase(heard, expected) {
  let bestScore = 0
  let bestMatched = 0
  if (!heard.length || !expected.length) return { score: 0, matched: 0 }

  const attempts = [{ phrase: heard, skipped: 0 }]
  if (heard.length >= 3) attempts.push({ phrase: heard.slice(1), skipped: 1 })

  for (const { phrase, skipped } of attempts) {
    if (phrase.length < 2) continue
    for (let start = 0; start < expected.length; start += 1) {
      if (!tokensMatch(phrase[0], expected[start], ASK_MUTQIN_TOKEN_THRESHOLD)) continue
      const matched = countOrderedMatches(phrase, expected, start)
      if (matched < 2) continue
      const coverage = matched / heard.length
      const complete = matched === phrase.length && skipped === 0
      const score = Math.max(0, Math.min(1, coverage + (complete ? 0.12 : 0) - (skipped ? 0.08 : 0)))
      if (matched > bestMatched || (matched === bestMatched && score > bestScore)) {
        bestMatched = matched
        bestScore = score
      }
    }
  }
  return { score: bestScore, matched: bestMatched }
}

export function scoreAyahPrefix(heardWords, ayahWords) {
  const heard = Array.isArray(heardWords) ? heardWords.filter(Boolean) : []
  const expected = Array.isArray(ayahWords) ? ayahWords.filter(Boolean) : []
  return alignPhrase(heard, expected).score
}

const tokenIndexCache = new WeakMap()

function tokenLookup(index) {
  const cached = tokenIndexCache.get(index)
  if (cached) return cached
  const map = new Map()
  index.forEach((item, indexAt) => {
    const seen = new Set()
    for (const word of item.words || []) {
      if (!word || seen.has(word)) continue
      seen.add(word)
      const bucket = map.get(word)
      if (bucket) bucket.push(indexAt)
      else map.set(word, [indexAt])
    }
  })
  tokenIndexCache.set(index, map)
  return map
}

function candidateItems(index, heardWords, surahFilter) {
  const lookup = tokenLookup(index)
  const ids = new Set()
  for (const token of heardWords.slice(0, 3)) {
    const bucket = lookup.get(token)
    if (!bucket) continue
    for (const indexAt of bucket) ids.add(indexAt)
  }
  let items = [...ids].map((indexAt) => index[indexAt]).filter(Boolean)
  if (Number(surahFilter) > 0) {
    items = items.filter((item) => Number(item.surah) === Number(surahFilter))
  }
  if (items.length) return items

  const anchors = heardWords.slice(0, 2)
  return index.filter((item) => {
    if (Number(surahFilter) > 0 && Number(item.surah) !== Number(surahFilter)) return false
    const words = Array.isArray(item.words) ? item.words : []
    return anchors.some((token) => words.some((word) => tokensMatch(token, word, 0.45)))
  })
}

function rankCandidates(index, heardWords, surahFilter) {
  const scoped = candidateItems(index, heardWords, surahFilter)

  const ranked = []
  for (const item of scoped) {
    const words = Array.isArray(item.words) ? item.words : []
    if (!words.length) continue
    const aligned = alignPhrase(heardWords, words)
    if (aligned.score < 0.22 || aligned.matched < 2) continue
    ranked.push({ ...item, score: aligned.score, matched: aligned.matched })
  }
  ranked.sort((a, b) => (b.matched - a.matched) || (b.score - a.score) || a.surah - b.surah || a.ayah - b.ayah)
  return ranked.slice(0, 8)
}

/**
 * Progressive span match. A phrase may start at any word in the ayah.
 * @returns {{ status: 'insufficient'|'ambiguous'|'multiple'|'no_match'|'matched', match?: object, candidates?: object[] }}
 */
export function matchHeardAyahPrefix(index, transcript, { surah = null } = {}) {
  const rawHeard = tokenizeHeardArabic(transcript)
  const heard = stripLeadingBasmalaTokens(rawHeard)
  if (!heard.length) return { status: 'insufficient', candidates: [] }

  const ranked = rankCandidates(Array.isArray(index) ? index : [], heard, surah)
  if (!ranked.length) {
    return heard.length >= ASK_MUTQIN_MIN_WORDS
      ? { status: 'no_match', candidates: [] }
      : { status: 'insufficient', candidates: [] }
  }

  const top = ranked[0]
  const runnerUp = ranked[1]
  const viable = filterViableAyahMatches(ranked)
  const clearWinner = isClearAyahMatchWinner(top, runnerUp)
  const uniqueTop = !runnerUp || (top.score - runnerUp.score) >= ASK_MUTQIN_AMBIGUOUS_GAP
    || (top.matched || 0) > (runnerUp?.matched || 0)
  const uniqueExact = ranked.filter((item) => item.score >= ASK_MUTQIN_UNIQUE_SCORE).length === 1
  const strongEnough = top.score >= ASK_MUTQIN_STRONG_SCORE
  const spanWins = (top.matched || 0) >= 2
    && (top.matched || 0) > (runnerUp?.matched || 0)
    && top.score >= 0.5

  if (heard.length >= ASK_MUTQIN_MIN_WORDS && viable.length > 1 && !clearWinner) {
    return { status: 'multiple', match: top, candidates: viable }
  }

  const uniqueEarly = heard.length >= ASK_MUTQIN_UNIQUE_MIN_WORDS
    && uniqueExact
    && uniqueTop
    && top.score >= ASK_MUTQIN_UNIQUE_SCORE

  const threeWordHit = heard.length >= ASK_MUTQIN_MIN_WORDS && strongEnough && (
    clearWinner || viable.length <= 1
  ) && (
    uniqueTop
    || top.score >= 0.55
    || (top.score - (runnerUp?.score || 0)) >= 0.08
    || spanWins
  )

  if (uniqueEarly || threeWordHit || (spanWins && clearWinner)) {
    return { status: 'matched', match: top, candidates: viable.length ? viable : ranked }
  }

  if (heard.length >= ASK_MUTQIN_MIN_WORDS && !strongEnough) {
    return { status: 'no_match', candidates: ranked }
  }

  if (heard.length >= ASK_MUTQIN_MIN_WORDS && ranked.length > 1) {
    return { status: 'multiple', match: top, candidates: viable.length ? viable : ranked.slice(0, 6) }
  }

  return { status: 'insufficient', candidates: ranked }
}

const ASK_MUTQIN_DISPLAY_ORNAMENTS = /[\u06D6-\u06E0\u06E9\u06EC\u08E2\u06DD\u06DE\u25CF\u25CB\u25C9\u25D8\u25D9\u26AB\u2B24\u2B58\u29BF\u2022\u2024\u00B7\u30FB\u2219\u22C5\u00B0\u25E6\u2218\u23FA\uFD3E\uFD3F۞۝۩]/g
const ASK_MUTQIN_ARABIC_LETTER = /[\u0621-\u064A\u0671-\u06D3\u06FA-\u06FF]/

/**
 * Strip ayah-end roundels, rubʿ al-ḥizb marks, waqf circles, and any other
 * filled ornaments so search results never show black dots.
 */
export function sanitizeAskMutqinAyahDisplay(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(ASK_MUTQIN_DISPLAY_ORNAMENTS, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isDisplayAyahWord(token) {
  return ASK_MUTQIN_ARABIC_LETTER.test(String(token || ''))
}

function tokenizeDisplayAyahWords(text) {
  return sanitizeAskMutqinAyahDisplay(text)
    .split(/\s+/)
    .filter(isDisplayAyahWord)
}

/**
 * @param {string} arabic
 * @param {string} transcript
 * @returns {Array<{ text: string, highlight: boolean }>}
 */
export function buildAskMutqinAyahHighlightParts(arabic, transcript) {
  const displayTokens = tokenizeDisplayAyahWords(arabic)
  if (!displayTokens.length) {
    const fallback = sanitizeAskMutqinAyahDisplay(arabic)
    return fallback ? [{ text: fallback, highlight: false }] : []
  }

  const heard = stripLeadingBasmalaTokens(tokenizeHeardArabic(transcript))
  if (!heard.length) {
    return displayTokens.map((text) => ({ text, highlight: false }))
  }

  const expected = displayTokens.map((token) => normalizeForMatch(token))
  const windowSize = Math.min(10, Math.max(4, heard.length + 3))
  let bestIndexes = new Set()
  let bestMatched = 0
  let bestScore = 0

  for (let start = 0; start < expected.length; start += 1) {
    const slice = expected.slice(start)
    const { matchedIndexes } = matchSequentialTokens({
      expectedTokens: slice,
      heardTokens: heard,
      windowSize,
      threshold: ASK_MUTQIN_TOKEN_THRESHOLD,
    })
    if (matchedIndexes.length < 1) continue
    const absolute = matchedIndexes.map((index) => start + index)
    const coverage = matchedIndexes.length / Math.max(1, heard.length)
    const score = coverage + (matchedIndexes.length >= heard.length ? 0.08 : 0)
    if (
      matchedIndexes.length > bestMatched
      || (matchedIndexes.length === bestMatched && score > bestScore)
    ) {
      bestMatched = matchedIndexes.length
      bestScore = score
      bestIndexes = new Set(absolute)
    }
  }

  return displayTokens.map((text, index) => ({
    text,
    highlight: bestIndexes.has(index),
  }))
}

/**
 * Map audio progress onto display words using length-weighted timing.
 */
export function resolvePlaybackWordIndex(parts, currentTime, duration) {
  const words = Array.isArray(parts) ? parts : []
  if (!words.length) return -1
  const time = Number(currentTime)
  const total = Number(duration)
  if (!Number.isFinite(time) || time < 0) return -1
  if (!Number.isFinite(total) || total <= 0) return 0
  const weights = words.map((part) => (
    Math.max(1, String(part?.text || '').replace(/[^\u0621-\u064A]/g, '').length)
  ))
  const mass = weights.reduce((sum, weight) => sum + weight, 0) || words.length
  const progress = Math.min(1, Math.max(0, time / total)) * mass
  let cursor = 0
  for (let index = 0; index < weights.length; index += 1) {
    cursor += weights[index]
    if (progress < cursor) return index
  }
  return words.length - 1
}
