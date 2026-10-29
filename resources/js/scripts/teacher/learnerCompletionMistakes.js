import { tokenizeRecitationDisplayWords } from '../engine/recitation_analysis.js'
import { formatIcuPluralMessage } from '../../utils/icuPluralFormat.js'
import { resolveGlobalAyahNumber } from '../audio/sessionReciter.js'

export const MISTAKE_TYPES = Object.freeze(['missed', 'wrong', 'tajweed'])

/**
 * @param {object|null|undefined} row
 * @returns {{ mistakes: object[], recordingUrl: string|null, dataGaps: string[], surah: number|null }}
 */
export function resolveLearnerCompletionAttempt(row) {
  const attempt = row?.completion_result?.attempt || null
  const range = row?.evidence?.range || row?.assignment || {}
  const surah = Number(range.surah ?? range.surah_number ?? row?.assignment?.surah_number) || null

  if (attempt && typeof attempt === 'object') {
    return {
      mistakes: Array.isArray(attempt.mistakes) ? attempt.mistakes : [],
      recordingUrl: attempt.recording_url || attempt.recordingUrl || null,
      dataGaps: Array.isArray(attempt.data_gaps) ? attempt.data_gaps : [],
      surah,
    }
  }

  return { mistakes: [], recordingUrl: null, dataGaps: ['attempt_payload'], surah }
}

/**
 * @param {object[]} mistakes
 */
export function countMistakesByType(mistakes = []) {
  const counts = { missed: 0, wrong: 0, tajweed: 0 }
  for (const item of mistakes) {
    const type = String(item?.type || '')
    if (counts[type] !== undefined) counts[type] += 1
  }
  return counts
}

export function isPerfectCompletionResult(result) {
  return Number(result?.accuracy_percent) === 100
}

/**
 * @param {{ missed: number, wrong: number, tajweed: number }} counts
 * @param {(key: string, params?: object) => string} t
 * @param {string} locale
 */
export function buildMistakeSummaryChips(counts, t, locale = 'en') {
  const chips = []
  const specs = [
    { key: 'missed', i18n: 'teacher.learner_mistake_chip_missed' },
    { key: 'wrong', i18n: 'teacher.learner_mistake_chip_wrong' },
    { key: 'tajweed', i18n: 'teacher.learner_mistake_chip_tajweed' },
  ]
  for (const spec of specs) {
    const n = Number(counts[spec.key] || 0)
    if (n <= 0) continue
    chips.push({
      type: spec.key,
      count: n,
      label: formatIcuPluralMessage(t(spec.i18n), locale, { n }),
    })
  }
  return chips
}

/**
 * @param {object[]} mistakes
 */
export function groupMistakesByAyah(mistakes = []) {
  const map = new Map()
  for (const mistake of mistakes) {
    const ayah = Number(mistake?.ayah)
    if (!Number.isFinite(ayah) || ayah < 1) continue
    if (!map.has(ayah)) map.set(ayah, [])
    map.get(ayah).push(mistake)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ayah, items]) => ({ ayah, items }))
}

/**
 * @param {string} text
 * @param {number|null|undefined} highlightIndex
 */
export function buildAyahWordHighlightParts(text, highlightIndex) {
  const words = tokenizeRecitationDisplayWords(String(text || ''))
  if (!words.length) {
    return [{ text: String(text || ''), highlighted: false }]
  }
  const index = Number(highlightIndex)
  return words.map((word, i) => ({
    text: word,
    highlighted: Number.isFinite(index) && i === index,
  }))
}

export function mistakeWordIndex(mistake) {
  if (mistake?.word_index !== undefined && mistake?.word_index !== null) return Number(mistake.word_index)
  if (mistake?.wordIndex !== undefined && mistake?.wordIndex !== null) return Number(mistake.wordIndex)
  return null
}

/**
 * @param {number|null} surah
 * @param {number} ayah
 */
export function referenceUrlForAyah(surah, ayah) {
  const global = resolveGlobalAyahNumber(surah, ayah)
  if (!global) return null
  return `/audio/ayah/ar.alafasy/${global}.mp3`
}

/**
 * @param {object} mistake
 * @param {number|null} surah
 */
export function resolveMistakeReferenceUrl(mistake, surah) {
  const fromPayload = mistake?.reference_url || mistake?.referenceUrl
  if (fromPayload) return fromPayload
  return referenceUrlForAyah(surah, Number(mistake?.ayah))
}

export function msToSeconds(ms) {
  const value = Number(ms)
  if (!Number.isFinite(value) || value < 0) return null
  return value / 1000
}
