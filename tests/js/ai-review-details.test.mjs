import assert from 'node:assert/strict'
import { buildAiReviewDetails } from '../../resources/js/scripts/recommendations/aiReviewDetails.js'

const t = (key, params = {}) => {
  const map = {
    'memorisation.postSession.recommendation.aiMetricAccuracy': 'Match',
    'memorisation.postSession.recommendation.aiMetricWords': 'Words',
    'memorisation.postSession.recommendation.aiMetricWordsApprox': `~${params.percent}% matched`,
    'memorisation.postSession.recommendation.aiMetricMissed': 'Missed',
    'memorisation.postSession.recommendation.aiMetricOrder': 'Order',
    'memorisation.postSession.recommendation.aiMetricOrderSteady': 'Steady',
    'memorisation.postSession.recommendation.aiMetricOrderIssues': `${params.count} slips`,
    'memorisation.postSession.recommendation.aiMetricClose': 'Close',
    'memorisation.postSession.recommendation.aiHighlightStrongRecall': 'Most words landed cleanly.',
    'memorisation.postSession.recommendation.aiHighlightMissedWords': `${params.count} words still need another careful pass.`,
    'memorisation.postSession.recommendation.aiHighlightPronunciation': `${params.count} words were close.`,
    'memorisation.postSession.recommendation.aiHighlightSequence': 'Ayah order drifted.',
    'memorisation.postSession.recommendation.aiHighlightWeakAyah': `Ayah ${params.ayah} carried most of the difficulty.`,
    'memorisation.postSession.recommendation.aiHighlightWeakAyahs': `${params.count} ayahs need focus (${params.ayahs}).`,
    'memorisation.postSession.recommendation.aiHighlightMixed': 'Solid overall, with a few gaps.',
    'memorisation.postSession.recommendation.aiHighlightWeak': 'Several spots need support.',
    'memorisation.postSession.recommendation.aiOutcomeStrong': 'Strong',
    'memorisation.postSession.recommendation.aiOutcomeMixed': 'Mixed',
    'memorisation.postSession.recommendation.aiOutcomeWeak': 'Needs work',
    'memorisation.postSession.recommendation.aiReviewDuration': `${params.seconds}s check`,
    'memorisation.postSession.recommendation.aiFocusStrong': 'Keep this pace.',
    'memorisation.postSession.recommendation.aiFocusNearly': 'One careful pass.',
    'memorisation.postSession.recommendation.aiFocusRetry': 'Rebuild ayah by ayah.',
    'memorisation.postSession.recommendation.aiFocusMissed': `Return to the ${params.count} missed words.`,
    'memorisation.postSession.recommendation.aiFocusPronunciation': `Articulate the ${params.count} close words.`,
    'memorisation.postSession.recommendation.aiFocusSequence': 'Restart from the first ayah.',
    'memorisation.postSession.recommendation.aiFocusWeakAyah': `Focus on ayah ${params.ayah}.`,
    'memorisation.postSession.recommendation.aiFocusWeakAyahs': `Revisit ayahs ${params.ayahs}.`,
  }
  return map[key] || key
}

{
  const details = buildAiReviewDetails('strong', {
    accuracy_percent: 91,
    missed_words: 0,
    sequence_errors: 0,
    duration_seconds: 18,
  }, {
    accuracyScore: 91,
    durationSeconds: 18,
    wordStatuses: [
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' },
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' },
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' },
      { status: 'incorrect' },
    ],
    mistakeBreakdown: { missing: ['كلمة'], incorrect: [], partial: [], sequenceErrors: [] },
  }, t)

  assert.equal(details.outcome, 'strong')
  assert.equal(details.accuracy, 91)
  assert.equal(details.outcomeLabel, 'Strong')
  assert.equal(details.durationLabel, '18s check')
  assert.ok(details.metrics.length >= 4)
  assert.ok(details.metrics.some((m) => m.key === 'accuracy' && m.value === '91%'))
  assert.ok(details.metrics.some((m) => m.key === 'words' && m.value === '9/10'))
  assert.ok(details.metrics.some((m) => m.key === 'missed' && m.value === '1'))
  assert.ok(details.highlights.length >= 2)
  assert.ok(details.highlights.some((h) => /missed|careful pass/i.test(h.text)))
  assert.ok(details.focus)
  assert.match(details.focus, /missed words/i)
}

{
  const details = buildAiReviewDetails('mixed', {
    accuracy_percent: 72,
    weak_ayahs: [3, 5],
    sequence_errors: 2,
  }, {
    accuracyScore: 72,
    weakAyahs: [3, 5],
    mistakeBreakdown: {
      missing: [],
      incorrect: ['a', 'b'],
      partial: ['c'],
      sequenceErrors: ['s1', 's2'],
    },
  }, t)

  assert.equal(details.outcome, 'mixed')
  assert.deepEqual(details.weakAyahs, [3, 5])
  assert.ok(details.metrics.some((m) => m.key === 'sequence' && /2 slips/.test(m.value)))
  assert.ok(details.highlights.some((h) => h.key === 'weak-ayahs'))
  assert.match(details.focus, /ayahs 3, 5/i)
}

{
  const details = buildAiReviewDetails('strong', { accuracy_percent: 96 }, null, t)
  assert.equal(details.accuracy, 96)
  assert.ok(details.metrics.length >= 3)
  assert.ok(details.highlights.length >= 1)
  assert.match(details.focus, /Keep this pace/i)
}

console.log('ai-review-details.test.mjs: ok')
