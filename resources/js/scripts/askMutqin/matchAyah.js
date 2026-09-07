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

function rankCandidates(index, heardWords, surahFilter) {
  const scoped = Number(surahFilter) > 0
    ? index.filter((item) => Number(item.surah) === Number(surahFilter))
    : index

  const anchors = heardWords.slice(0, 2)
  const ranked = []
  for (const item of scoped) {
    const words = Array.isArray(item.words) ? item.words : []
    if (!words.length) continue
    // The recited span may begin on any word, and the first heard token may be a false start.
    const anchored = anchors.some((token) => words.some((word) => tokensMatch(token, word, 0.45)))
    if (anchors.length && !anchored) continue
    const aligned = alignPhrase(heardWords, words)
    if (aligned.score < 0.22 || aligned.matched < 2) continue
    ranked.push({ ...item, score: aligned.score, matched: aligned.matched })
  }
  ranked.sort((a, b) => (b.matched - a.matched) || (b.score - a.score) || a.surah - b.surah || a.ayah - b.ayah)
  return ranked.slice(0, 8)
}

/**
 * Progressive span match. A phrase may start at any word in the ayah.
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
    || (top.matched || 0) > (runnerUp?.matched || 0)
  const uniqueExact = ranked.filter((item) => item.score >= ASK_MUTQIN_UNIQUE_SCORE).length === 1
  const strongEnough = top.score >= ASK_MUTQIN_STRONG_SCORE
  const spanWins = (top.matched || 0) >= 2
    && (top.matched || 0) > (runnerUp?.matched || 0)
    && top.score >= 0.5

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
    || spanWins
  )

  if (uniqueEarly || threeWordHit || spanWins) {
    return { status: 'matched', match: top, candidates: ranked }
  }

  if (heard.length >= ASK_MUTQIN_MIN_WORDS && ranked.length > 1 && !uniqueTop) {
    return { status: 'ambiguous', candidates: ranked }
  }

  return { status: 'insufficient', candidates: ranked }
}
