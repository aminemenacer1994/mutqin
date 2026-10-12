import {
  arabicAlefOptionalEqual,
  getRecitationWordSimilarity,
  normalizeArabicForRecitation,
} from '../engine/recitation_analysis.js'
import {
  normalizeForMatch,
  tokenizeForMatch,
} from '../memorisationDetection/speechMatch.js'

export const ASK_MUTQIN_MIN_WORDS = 3
export const ASK_MUTQIN_UNIQUE_MIN_WORDS = 2
export const ASK_MUTQIN_STRONG_SCORE = 0.42
export const ASK_MUTQIN_UNIQUE_SCORE = 0.68
export const ASK_MUTQIN_AMBIGUOUS_GAP = 0.02
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

/**
 * Find-by-voice needs higher precision than live recitation assessment. The
 * generic recitation matcher intentionally accepts article removal and short
 * word similarity; that turns لا/فلا and إله/إلا into false Quran search hits.
 * Keep exact normalized words, and only allow a small ASR edit tolerance for
 * longer words.
 */
function askMutqinTokensMatch(heard, expected) {
  const left = normalizeForMatch(heard)
  const right = normalizeForMatch(expected)
  if (!left || !right) return false
  if (left === right) return true
  // Qur'anic dagger-alif can be written or omitted by speech recognition
  // (إِلَٰه / إله). This is safe to accept before short-word matching.
  if (arabicAlefOptionalEqual(left, right)) return true
  if (Math.min(left.length, right.length) < 4) return false
  return getRecitationWordSimilarity(left, right, { allowArticleMatch: false }) >= 0.82
}

function expandAttachedArabicWords(words = []) {
  const expanded = []
  for (const word of Array.isArray(words) ? words : []) {
    // Speech recognition sometimes emits “لا إله” as one Arabic token.
    // Restore that boundary before candidate lookup and ranking.
    if (word === 'لااله' || word === 'لاالاه') {
      expanded.push('لا', 'اله')
    } else {
      expanded.push(word)
    }
  }
  return expanded
}

function isMeaningfulWord(word) {
  const value = String(word || '').trim()
  if (!value) return false
  if (value.length >= 2) return true
  return SHORT_PARTICLES.has(normalizeArabicForRecitation(value))
}

export function tokenizeHeardArabic(text) {
  return expandAttachedArabicWords(tokenizeForMatch(text)).filter(isMeaningfulWord)
}

export function stripLeadingBasmalaTokens(words = []) {
  const list = Array.isArray(words) ? words.slice() : []
  if (list.length < BASMALA_WORDS.length) return list
  const leading = list.slice(0, BASMALA_WORDS.length)
  const isBasmala = leading.every((word, index) => askMutqinTokensMatch(word, BASMALA_WORDS[index]))
  return isBasmala ? list.slice(BASMALA_WORDS.length) : list
}

function requiredPhraseWords(heardLength) {
  const length = Math.max(0, Number(heardLength) || 0)
  if (length < ASK_MUTQIN_MIN_WORDS) return length
  // A voice transcript can include a brief false start or a repeated final
  // token. Three adjacent Quran words are enough evidence for the finder;
  // longer recitations must contribute at least one additional word.
  return length >= 6 ? 4 : ASK_MUTQIN_MIN_WORDS
}

/**
 * Find one uninterrupted run in an ayah. We deliberately stop at the first
 * mismatch: finding word one, then jumping across an ayah to find words two
 * and three is not evidence that the user recited that phrase.
 */
function findContiguousPhraseSpan(heard, expected) {
  const phrase = Array.isArray(heard) ? heard.filter(Boolean) : []
  const words = Array.isArray(expected) ? expected.filter(Boolean) : []
  if (!phrase.length || !words.length) return { score: 0, matched: 0, start: -1, end: -1 }

  let best = { score: 0, matched: 0, start: -1, end: -1 }
  const required = requiredPhraseWords(phrase.length)

  // Search each local part of the transcript. Speechmatics occasionally adds
  // a repeated word or a short false start, which must not make a clearly
  // recited Quran phrase unfindable. The target side never skips a word, so
  // every accepted result is still one continuous Quran span.
  for (let heardStart = 0; heardStart <= phrase.length - required; heardStart += 1) {
    for (let start = 0; start < words.length; start += 1) {
      if (!askMutqinTokensMatch(phrase[heardStart], words[start])) continue

      let heardIndex = heardStart
      let matched = 0
      let skippedHeard = 0
      while (heardIndex < phrase.length && start + matched < words.length) {
        if (askMutqinTokensMatch(phrase[heardIndex], words[start + matched])) {
          matched += 1
          heardIndex += 1
          continue
        }
        if (skippedHeard < 1 && heardIndex + 1 < phrase.length) {
          skippedHeard += 1
          heardIndex += 1
          continue
        }
        break
      }

      if (matched < required) continue
      const comparedWords = Math.max(ASK_MUTQIN_MIN_WORDS, Math.min(5, phrase.length - heardStart))
      const coverage = matched / comparedWords
      const score = Math.min(1, coverage + (skippedHeard ? -0.04 : 0) + (matched >= phrase.length - heardStart ? 0.12 : 0))
      if (matched > best.matched || (matched === best.matched && score > best.score)) {
        best = { score, matched, start, end: start + matched - 1 }
      }
    }
  }
  return best
}

export function scoreAyahPrefix(heardWords, ayahWords) {
  const heard = Array.isArray(heardWords) ? heardWords.filter(Boolean) : []
  const expected = Array.isArray(ayahWords) ? ayahWords.filter(Boolean) : []
  return findContiguousPhraseSpan(heard, expected).score
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
    return anchors.some((token) => words.some((word) => askMutqinTokensMatch(token, word)))
  })
}

function rankCandidates(index, heardWords, surahFilter) {
  const scoped = candidateItems(index, heardWords, surahFilter)

  const ranked = []
  for (const item of scoped) {
    const words = Array.isArray(item.words) ? item.words : []
    if (!words.length) continue
    const aligned = findContiguousPhraseSpan(heardWords, words)
    if (aligned.matched < requiredPhraseWords(heardWords.length)) continue
    ranked.push({ ...item, ...aligned })
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
  const span = findContiguousPhraseSpan(heard, expected)
  const bestIndexes = new Set()
  if (span.matched >= requiredPhraseWords(heard.length)) {
    for (let index = span.start; index <= span.end; index += 1) bestIndexes.add(index)
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
