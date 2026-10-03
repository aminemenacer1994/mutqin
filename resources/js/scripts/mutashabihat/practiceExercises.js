import { buildAyahComparison, differenceSpans, phraseFromSpan } from './compareAyahs.js'

function otherVerseKeyInPair(pair, anchorVerseKey) {
  const anchor = String(anchorVerseKey || '').trim()
  if (!pair) return ''
  if (pair.verse_key_1 === anchor) return pair.verse_key_2
  if (pair.verse_key_2 === anchor) return pair.verse_key_1
  return pair.verse_key_2 || ''
}

function shuffle(arr, rng = Math.random) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function uniquePhrase(text, seen) {
  const value = String(text || '').trim()
  if (!value) return ''
  const key = value.replace(/\s+/g, ' ')
  if (seen.has(key)) return ''
  seen.add(key)
  return value
}

/**
 * @param {object} params
 * @param {object} params.pair
 * @param {string} params.anchorVerseKey
 * @param {Record<string, string>} params.arabicByKey
 * @param {Record<string, string>} [params.translationByKey]
 * @param {Record<string, string>} [params.labelsByKey]
 * @param {() => number} [params.rng]
 */
export function buildMutashabihatPracticePlan(params = {}) {
  const pair = params.pair
  const anchor = String(params.anchorVerseKey || '').trim()
  const other = otherVerseKeyInPair(pair, anchor)
  const anchorArabic = String(params.arabicByKey?.[anchor] || '').trim()
  const otherArabic = String(params.arabicByKey?.[other] || '').trim()
  if (!anchor || !other || !anchorArabic || !otherArabic) return []

  const comparison = buildAyahComparison(anchorArabic, otherArabic)
  if (!comparison.span && comparison.stats.shared === comparison.left.length) return []

  const labels = params.labelsByKey || {}
  const translations = params.translationByKey || {}
  const seen = new Set()
  const correctPhrase = uniquePhrase(comparison.leftPhrase, seen)
    || uniquePhrase(phraseFromSpan(comparison.left, comparison.spans[0]), seen)
  const otherPhrase = uniquePhrase(comparison.rightPhrase, seen)
    || uniquePhrase(phraseFromSpan(comparison.right, comparison.spans[0]), seen)

  const extraSpans = differenceSpans(comparison.left, comparison.right).slice(1)
  let extraPhrase = ''
  for (const span of extraSpans) {
    extraPhrase = uniquePhrase(phraseFromSpan(comparison.right, span), seen)
      || uniquePhrase(phraseFromSpan(comparison.left, span), seen)
    if (extraPhrase) break
  }

  const identifyOptions = shuffle([
    correctPhrase ? { id: 'anchor', text: correctPhrase, correct: true } : null,
    otherPhrase ? { id: 'other', text: otherPhrase, correct: false } : null,
    extraPhrase ? { id: 'extra', text: extraPhrase, correct: false } : null,
  ].filter(Boolean), params.rng)

  if (identifyOptions.length < 2) return []

  return [
    {
      id: 'compare',
      kind: 'compare',
      anchorVerseKey: anchor,
      otherVerseKey: other,
      leftHtml: comparison.leftHtml,
      rightHtml: comparison.rightHtml,
      leftTranslation: translations[anchor] || '',
      rightTranslation: translations[other] || '',
      leftPhrase: comparison.leftPhrase,
      rightPhrase: comparison.rightPhrase,
    },
    {
      id: 'recall',
      kind: 'recall',
      promptKey: 'recallPrompt',
      anchorVerseKey: anchor,
      blankHtml: comparison.leftBlankHtml,
      answerPhrase: comparison.leftPhrase,
      otherPhrase: comparison.rightPhrase,
    },
    {
      id: 'choose',
      kind: 'choose',
      promptKey: 'identifyContinuation',
      anchorVerseKey: anchor,
      contextHtml: comparison.leftBlankHtml,
      options: identifyOptions,
      leftPhrase: comparison.leftPhrase,
      rightPhrase: comparison.rightPhrase,
    },
    {
      id: 'recite',
      kind: 'recite',
      promptKey: 'reciteFromMemory',
      anchorVerseKey: anchor,
      otherVerseKey: other,
      targetVerseKey: anchor,
      requiresAiRecite: true,
      pairAlso: true,
    },
  ]
}

export function gradeIdentifyChoice(options, selectedId) {
  const match = (options || []).find((o) => o.id === selectedId)
  return !!match?.correct
}

export function shouldRecitePairedAyah(results = {}) {
  if (results.recall?.remembered === false) return true
  if (results.choose?.correct === false) return true
  if (results.recite?.confused) return true
  if (results.recite?.success === false && results.recite?.attempted) return true
  return false
}

export function summarisePracticeSuccess(results = {}) {
  const recallOk = results.recall?.remembered !== false
  const chooseOk = results.choose?.correct !== false
  const recite = results.recite || {}
  const reciteOk = !recite.attempted
    || recite.skipped
    || recite.unassessed
    || (recite.success !== false && !recite.confused)
  return !!(recallOk && chooseOk && reciteOk)
}

export function distinctionRemembered(results = {}) {
  if (results.choose?.correct === false) return false
  if (results.recall?.remembered === false) return false
  if (results.recite?.confused) return false
  if (results.recall?.remembered === true || results.choose?.correct === true) return true
  return null
}
