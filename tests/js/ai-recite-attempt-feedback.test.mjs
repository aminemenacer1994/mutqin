import assert from 'node:assert/strict'
import {
  compactAttemptSummary,
  countWordStatuses,
  feedbackInsightKey,
  matchPercent,
  resolveWordCounts,
  reviewWordPairs,
} from '../../resources/js/scripts/dashboardAiRecite/attemptFeedback.js'

const words = [
  { ayah_number: 1, status: 'correct', text: 'ٱلْحَمْدُ' },
  { ayah_number: 1, status: 'correct', text: 'لِلَّهِ' },
  { ayah_number: 1, status: 'uncertain', text: 'رَبِّ', recognised_word: 'رب' },
  { ayah_number: 1, status: 'wrong', text: 'ٱلْعَٰلَمِينَ', recognised_word: 'العالمين' },
  { ayah_number: 1, status: 'skipped', text: 'ٱلرَّحْمَٰنِ' },
  { ayah_number: 1, status: 'extra', text: 'زيادة' },
]

const counts = countWordStatuses(words)
assert.equal(counts.matched, 2)
assert.equal(counts.uncertain, 1)
assert.equal(counts.mismatch, 1)
assert.equal(counts.skipped, 1)
assert.equal(counts.extra, 1)
assert.equal(counts.evaluated, 5)
// Extras must not inflate "words to review".
assert.equal(counts.attention, 3)

const mismatchOnly = compactAttemptSummary({
  accuracy_percent: 93,
  word_counts: {
    matched: 26,
    uncertain: 2,
    mismatch: 0,
    skipped: 1,
    extra: 1,
    unassessed: 0,
    evaluated: 29,
    attention: 4, // stale / wrong; UI must reconcile from components
  },
  flagged_word_count: 3,
}, (key, params = {}) => {
  if (key === 'dashboard.ai_recite.words_to_review') return `${params.n} words to review`
  if (key === 'dashboard.ai_recite.words_matched_percent') return `${params.n}% words matched`
  if (key === 'dashboard.ai_recite.insight_few') return 'A few words to review.'
  return key
})
assert.equal(mismatchOnly.matched, 26)
assert.equal(mismatchOnly.uncertain, 2)
assert.equal(mismatchOnly.mismatch, 0)
assert.equal(mismatchOnly.skipped, 1)
assert.equal(mismatchOnly.attention, 3)
assert.equal(mismatchOnly.reviewHint, '3 words to review')
assert.equal(feedbackInsightKey(counts), 'insight_few')
assert.equal(feedbackInsightKey({ ...counts, attention: 0, uncertain: 0, mismatch: 0, skipped: 0, extra: 0 }), 'insight_excellent')
assert.equal(feedbackInsightKey({ ...counts, attention: 5 }), 'insight_review')
assert.equal(feedbackInsightKey({ matched: 0, uncertain: 0, mismatch: 0, skipped: 0, extra: 0, unassessed: 4, evaluated: 0, attention: 0 }), 'insight_incomplete')

assert.equal(matchPercent({ accuracy_percent: 91 }, counts), 91)
assert.equal(matchPercent({}, counts), 40)

const fromApi = resolveWordCounts({
  word_counts: {
    matched: 28,
    uncertain: 2,
    mismatch: 1,
    skipped: 0,
    extra: 0,
    unassessed: 0,
    evaluated: 31,
    attention: 3,
  },
})
assert.equal(fromApi.matched, 28)
assert.equal(fromApi.source, 'word_counts')

const fromColors = resolveWordCounts({
  color_counts: { green: 10, amber: 1, red: 2, black: 1, gray: 0 },
})
assert.equal(fromColors.matched, 10)
assert.equal(fromColors.uncertain, 1)
assert.equal(fromColors.mismatch, 2)
assert.equal(fromColors.skipped, 1)

const pairs = reviewWordPairs(words, 1)
assert.equal(pairs.length, 4)
assert.equal(pairs[0].expected, 'رَبِّ')
assert.equal(pairs[0].recognised, 'رب')
assert.equal(pairs[0].state, 'uncertain')
assert.equal(pairs[1].state, 'mismatch')
assert.equal(pairs[2].recognised, null)
assert.equal(pairs[2].state, 'skipped')
assert.equal(pairs[3].state, 'extra')

const summary = compactAttemptSummary({
  accuracy_percent: 91,
  word_counts: fromApi,
  flagged_word_count: 3,
  occurred_at: '2026-11-13T09:00:00Z',
}, (key, params = {}) => {
  if (key === 'dashboard.ai_recite.words_matched_percent') return `${params.n}% words matched`
  if (key === 'dashboard.ai_recite.words_to_review') return `${params.n} words to review`
  if (key === 'dashboard.ai_recite.insight_few') return 'A few words to review.'
  return key
})
assert.equal(summary.percent, 91)
assert.equal(summary.wordsMatchedLabel, '91% words matched')
assert.equal(summary.reviewHint, '3 words to review')
assert.equal(summary.insight, 'A few words to review.')

console.log('ai-recite-attempt-feedback.test.mjs: ok')
