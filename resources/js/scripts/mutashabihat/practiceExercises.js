import { tokenizeVerifiedText } from '../assessment/QuestionValidationService.js'
import { otherVerseKeyInPair } from './pairsIndex.js'

function shuffle(arr, rng = Math.random) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * @param {object} params
 * @param {object} params.pair
 * @param {string} params.anchorVerseKey
 * @param {Record<string, string>} params.arabicByKey
 * @param {() => number} [params.rng]
 */
export function buildMutashabihatPracticePlan(params = {}) {
  const pair = params.pair
  const anchor = String(params.anchorVerseKey || '').trim()
  const other = otherVerseKeyInPair(pair, anchor)
  const anchorArabic = String(params.arabicByKey?.[anchor] || '').trim()
  const otherArabic = String(params.arabicByKey?.[other] || '').trim()
  if (!anchor || !other || !anchorArabic || !otherArabic) return []

  const anchorTokens = tokenizeVerifiedText(anchorArabic)
  const otherTokens = tokenizeVerifiedText(otherArabic)
  if (anchorTokens.length < 3 || otherTokens.length < 3) return []

  const splitAt = Math.max(2, Math.floor(anchorTokens.length / 2))
  const visible = anchorTokens.slice(0, splitAt).join(' ')
  const hidden = anchorTokens.slice(splitAt).join(' ')

  const otherSplitAt = Math.max(2, Math.floor(otherTokens.length / 2))
  const otherTail = otherTokens.slice(otherSplitAt).join(' ')
  const anchorTail = anchorTokens.slice(splitAt).join(' ')

  const identifyOptions = shuffle([
    { id: 'anchor', text: anchorTail, correct: true },
    { id: 'other', text: otherTail, correct: false },
  ], params.rng)

  return [
    {
      id: 'study',
      kind: 'study',
      anchorVerseKey: anchor,
      otherVerseKey: other,
      anchorArabic,
      otherArabic,
    },
    {
      id: 'continue',
      kind: 'continue',
      promptKey: 'continueFromMemory',
      anchorVerseKey: anchor,
      visibleArabic: visible,
      expectedAnswer: hidden,
      requiresAiRecite: true,
    },
    {
      id: 'identify',
      kind: 'identify',
      promptKey: 'identifyContinuation',
      anchorVerseKey: anchor,
      contextArabic: anchorTokens.slice(0, splitAt).join(' ') + ' …',
      options: identifyOptions,
    },
    {
      id: 'recite',
      kind: 'recite',
      promptKey: 'reciteFromMemory',
      anchorVerseKey: anchor,
      requiresAiRecite: true,
    },
  ]
}

export function gradeContinueAnswer(expected, answer) {
  const e = tokenizeVerifiedText(expected).join(' ')
  const a = tokenizeVerifiedText(answer).join(' ')
  if (!e || !a) return false
  return e === a
}

export function gradeIdentifyChoice(options, selectedId) {
  const match = (options || []).find((o) => o.id === selectedId)
  return !!match?.correct
}
