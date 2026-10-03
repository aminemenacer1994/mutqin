import { normalizeQuranText, tokenizeVerifiedText } from '../assessment/QuestionValidationService.js'
import { findPairsForVerseKey, otherVerseKeyInPair } from './pairsIndex.js'
import { RECITATION_COLOR, classifyRecitationWordColor } from '../engine/recitation_analysis.js'

const MIN_SEQUENCE_TOKENS = 4
const MIN_CONFIDENCE = 0.55

function wordHeardText(word) {
  return String(
    word?.heard
    || word?.spoken
    || word?.transcript
    || word?.actual
    || word?.text
    || '',
  ).trim()
}

/**
 * @param {object[]} wordStatuses
 * @returns {string[]}
 */
function extractMisalignedHeardTokens(wordStatuses) {
  const tokens = []
  for (const word of wordStatuses || []) {
    const color = classifyRecitationWordColor(word?.status ?? word?.visualStatus ?? word)
    if (color === RECITATION_COLOR.GREEN) continue
    const heard = wordHeardText(word)
    if (!heard) continue
    for (const token of tokenizeVerifiedText(heard)) {
      if (token) tokens.push(normalizeQuranText(token))
    }
  }
  return tokens.filter(Boolean)
}

/**
 * Longest consecutive run of heard tokens matching a sliding window in candidate ayah.
 *
 * @param {string[]} heardNorm
 * @param {string[]} candidateNorm
 */
function longestConsecutiveRun(heardNorm, candidateNorm) {
  if (!heardNorm.length || !candidateNorm.length) return 0
  let best = 0
  for (let i = 0; i < candidateNorm.length; i += 1) {
    let run = 0
    for (let j = 0; j < heardNorm.length; j += 1) {
      if (candidateNorm[i + j] === heardNorm[j]) {
        run += 1
      } else {
        break
      }
    }
    if (run > best) best = run
  }
  return best
}

/**
 * Conservative similar-ayah drift detection using predefined pair candidates only.
 *
 * @param {object} input
 * @param {string} input.expectedVerseKey
 * @param {string} input.expectedArabic
 * @param {object[]} input.wordStatuses
 * @returns {null | { pair: object, confusedVerseKey: string, expectedVerseKey: string, confidence: number, matchedTokens: number }}
 */
export function detectMutashabihatDrift(input = {}) {
  const expectedVerseKey = String(input.expectedVerseKey || '').trim()
  const expectedArabic = String(input.expectedArabic || '').trim()
  if (!expectedVerseKey || !expectedArabic) return null

  const heardTokens = extractMisalignedHeardTokens(input.wordStatuses)
  if (heardTokens.length < MIN_SEQUENCE_TOKENS) return null

  const pairs = findPairsForVerseKey(expectedVerseKey)
  if (!pairs.length) return null

  const expectedNorm = tokenizeVerifiedText(expectedArabic).map((t) => normalizeQuranText(t))
  let best = null

  for (const pair of pairs) {
    const confusedKey = otherVerseKeyInPair(pair, expectedVerseKey)
    const confusedArabic = String(input.candidateArabicByKey?.[confusedKey] || '').trim()
    if (!confusedArabic) continue

    const confusedNorm = tokenizeVerifiedText(confusedArabic).map((t) => normalizeQuranText(t))
    const run = longestConsecutiveRun(heardTokens, confusedNorm)
    if (run < MIN_SEQUENCE_TOKENS) continue

    const expectedRun = longestConsecutiveRun(heardTokens, expectedNorm)
    if (run <= expectedRun) continue

    const confidence = Math.min(0.95, run / Math.max(heardTokens.length, MIN_SEQUENCE_TOKENS))
    if (confidence < MIN_CONFIDENCE) continue

    if (!best || run > best.matchedTokens || (run === best.matchedTokens && confidence > best.confidence)) {
      best = {
        pair,
        confusedVerseKey: confusedKey,
        expectedVerseKey,
        confidence,
        matchedTokens: run,
      }
    }
  }

  return best
}

export default detectMutashabihatDrift
