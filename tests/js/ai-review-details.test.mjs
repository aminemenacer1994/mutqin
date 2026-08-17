import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ASSESSMENT_QUALITY,
  buildAiReviewDetails,
  classifyRecitationAssessmentQuality,
  resolveRecognitionConfidence,
} from '../../resources/js/scripts/recommendations/aiReviewDetails.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

const t = (key, params = {}) => {
  const map = {
    'memorisation.postSession.recommendation.aiMetricAccuracy': 'Match',
    'memorisation.postSession.recommendation.aiMetricWords': 'Words',
    'memorisation.postSession.recommendation.aiMetricDetectedWords': 'Detected words',
    'memorisation.postSession.recommendation.aiMetricWordsApprox': `~${params.percent}% matched`,
    'memorisation.postSession.recommendation.aiMetricMissed': 'Missed',
    'memorisation.postSession.recommendation.aiMetricMissedWords': 'Missed words',
    'memorisation.postSession.recommendation.aiMetricOrder': 'Order',
    'memorisation.postSession.recommendation.aiMetricSequence': 'Sequence',
    'memorisation.postSession.recommendation.aiMetricOrderSteady': 'Steady',
    'memorisation.postSession.recommendation.aiMetricOrderIssues': `${params.count} slips`,
    'memorisation.postSession.recommendation.aiMetricOrderNotAssessed': 'Not assessed',
    'memorisation.postSession.recommendation.aiMetricSequenceNotEnough': 'Not enough matched words to assess',
    'memorisation.postSession.recommendation.aiMetricClose': 'Close',
    'memorisation.postSession.recommendation.aiMetricConfidence': 'Recognition confidence',
    'memorisation.postSession.recommendation.aiHighlightStrongRecall': 'Most words landed cleanly.',
    'memorisation.postSession.recommendation.aiHighlightMissedWords': `${params.count} words still need another careful pass.`,
    'memorisation.postSession.recommendation.aiHighlightPronunciation': `${params.count} words were close.`,
    'memorisation.postSession.recommendation.aiHighlightSequence': 'Ayah order drifted.',
    'memorisation.postSession.recommendation.aiHighlightWeakAyah': `Ayah ${params.ayah} carried most of the difficulty.`,
    'memorisation.postSession.recommendation.aiHighlightWeakAyahs': `${params.count} ayahs need focus (${params.ayahs}).`,
    'memorisation.postSession.recommendation.aiHighlightMixed': 'Solid overall, with a few gaps.',
    'memorisation.postSession.recommendation.aiHighlightWeak': 'Several spots need support.',
    'memorisation.postSession.recommendation.aiOutcomeStrong': 'Good',
    'memorisation.postSession.recommendation.aiOutcomeMixed': 'Okay',
    'memorisation.postSession.recommendation.statusReadyToContinue': 'Ready to continue',
    'memorisation.postSession.recommendation.statusMostlySecure': 'Mostly secure',
    'memorisation.postSession.recommendation.statusMorePracticeNeeded': 'More practice needed',
    'memorisation.postSession.recommendation.statusReviewRecommended': 'Review recommended',
    'memorisation.postSession.recommendation.aiOutcomeReviewRecommended': 'Review recommended',
    'memorisation.postSession.recommendation.aiOutcomeWeak': 'Needs practice',
    'memorisation.postSession.recommendation.confidenceNeedsPractice': 'Needs more practice',
    'memorisation.postSession.recommendation.aiReviewDuration': `${params.seconds}s check`,
    'memorisation.postSession.recommendation.aiFocusStrong': 'Keep this pace.',
    'memorisation.postSession.recommendation.aiFocusNearly': 'One careful pass.',
    'memorisation.postSession.recommendation.aiFocusRetry': 'Rebuild ayah by ayah.',
    'memorisation.postSession.recommendation.aiFocusMissed': `Return to the ${params.count} missed words.`,
    'memorisation.postSession.recommendation.aiFocusPronunciation': `Articulate the ${params.count} close words.`,
    'memorisation.postSession.recommendation.aiFocusSequence': 'Restart from the first ayah.',
    'memorisation.postSession.recommendation.aiFocusWeakAyah': `Focus on ayah ${params.ayah}.`,
    'memorisation.postSession.recommendation.aiFocusWeakAyahs': `Revisit ayahs ${params.ayahs}.`,
    'memorisation.postSession.recommendation.aiResultLineStrong': 'Strong overall — most of the range landed cleanly.',
    'memorisation.postSession.recommendation.aiResultLineStrongHesitation': `Strong overall, with one hesitation in Ayah ${params.ayah}.`,
    'memorisation.postSession.recommendation.aiResultLineStrongOneGap': 'Strong overall, with one small hesitation.',
    'memorisation.postSession.recommendation.aiResultLineMixed': 'Solid overall, with a few gaps to tighten.',
    'memorisation.postSession.recommendation.aiResultLineMixedAyah': `Solid overall, with a hesitation in Ayah ${params.ayah}.`,
    'memorisation.postSession.recommendation.aiResultLineMixedAyahs': `Solid overall, with hesitations in ${params.count} ayahs.`,
    'memorisation.postSession.recommendation.aiResultLineMixedOrder': 'Solid overall, but ayah order drifted once or twice.',
    'memorisation.postSession.recommendation.aiResultLineWeak': 'Needs another pass — several spots still need support.',
    'memorisation.postSession.recommendation.aiResultLineWeakAyah': `Needs another pass — Ayah ${params.ayah} carried most of the difficulty.`,
    'memorisation.postSession.recommendation.aiSummaryMatchedWords': `We clearly matched ${params.matched} of ${params.total} words.`,
    'memorisation.postSession.recommendation.aiSummaryFocusPhrase': 'Focus on the highlighted phrase before checking again.',
    'memorisation.postSession.recommendation.aiSummaryFocusRange': 'Revise this range, then check again.',
    'memorisation.postSession.recommendation.aiSummaryStrongMinorMistakes': 'Strong recitation — a couple of small mistakes, but you are making good progress.',
    'memorisation.postSession.recommendation.aiSummaryStrongFollowUp': 'Nice work — you can continue while this still feels fresh.',
    'memorisation.postSession.recommendation.zeroMatchStatus': 'Let’s practise this range again',
    'memorisation.postSession.recommendation.zeroMatchSummary': 'We heard your recitation, but could not confidently match the words yet.',
    'memorisation.postSession.recommendation.zeroMatchProgressLabel': 'Not matched yet',
    'memorisation.postSession.recommendation.zeroMatchHint': 'A short revision pass will help the words settle before you check again.',
    'memorisation.postSession.recommendation.zeroMatchFocus': 'Revise this range slowly, then check again.',
    'memorisation.postSession.recommendation.insufficientAudioStatus': 'We couldn’t assess this attempt. Check your microphone or connection and try again.',
    'memorisation.postSession.recommendation.insufficientAudioSummary': 'We couldn’t assess this attempt. Check your microphone or connection and try again.',
    'memorisation.postSession.recommendation.insufficientAudioMicSummary': 'Microphone access is blocked. Allow the microphone, then try recording again.',
    'memorisation.postSession.recommendation.insufficientAudioShortSummary': 'That recording was too short to assess. Recite a little longer, then try again.',
    'memorisation.postSession.recommendation.insufficientAudioProcessingSummary': 'We couldn’t assess this attempt. Check your microphone or connection and try again.',
    'memorisation.postSession.recommendation.insufficientAudioHint': 'Check your microphone or connection, then try again.',
    'memorisation.postSession.recommendation.insufficientAudioFocus': 'Check your microphone or connection, then try again.',
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
  assert.equal(details.outcomeLabel, 'Mostly secure')
  assert.equal(details.durationLabel, '18s check')
  assert.equal(details.presentationMode, 'standard')
  assert.equal(details.metrics.length, 0, 'primary metric wall hidden by default')
  assert.equal(details.showDetailsToggle, true)
  assert.ok(details.detailsMetrics.some((m) => m.key === 'accuracy' && m.value === '91%'))
  assert.ok(details.detailsMetrics.some((m) => m.key === 'words' && m.value === '9/10'))
  assert.ok(details.detailsMetrics.some((m) => m.key === 'missed' && m.value === '1'))
  assert.match(details.summaryLine, /We clearly matched 9 of 10 words/i)
  assert.doesNotMatch(details.summaryLine, /Focus on the highlighted phrase/i)
  assert.match(details.summaryLine, /Strong overall, with one small hesitation|Strong recitation|good progress/i)
  assert.doesNotMatch(details.summaryLine, /91%/)
  assert.ok(details.highlights.length >= 2)
  assert.ok(details.focus)
  assert.match(details.focus, /missed words/i)
}

{
  const details = buildAiReviewDetails('weak', {
    accuracy_percent: 60,
    missed_words: 4,
  }, {
    accuracyScore: 60,
    committedWords: [{ text: 'الحمد' }],
    wordStatuses: [
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' },
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' },
      { status: 'incorrect' }, { status: 'incorrect' },
      { status: 'incorrect' }, { status: 'incorrect' },
    ],
  }, t)

  assert.equal(details.outcomeLabel, 'More practice needed')
  assert.match(details.summaryLine, /We clearly matched 6 of 10 words/i)
  assert.match(details.summaryLine, /Focus on the highlighted phrase before checking again/i)
  assert.equal(details.metrics.length, 0)
  assert.ok(details.detailsMetrics.some((m) => m.key === 'accuracy' && m.value === '60%'))
  // One Match % only — no second equivalent accuracy percentage chip.
  assert.equal(details.detailsMetrics.filter((m) => /%/.test(String(m.value || ''))).length, 1)
}

{
  const details = buildAiReviewDetails('mixed', {
    accuracy_percent: 72,
    weak_ayahs: [3, 5],
    sequence_errors: 2,
  }, {
    accuracyScore: 72,
    weakAyahs: [3, 5],
    committedWords: [{ text: 'الحمد' }, { text: 'لله' }],
    wordStatuses: [
      { status: 'correct' }, { status: 'correct' }, { status: 'correct' },
      { status: 'partial' }, { status: 'incorrect' }, { status: 'incorrect' },
    ],
    mistakeBreakdown: {
      missing: [],
      incorrect: ['a', 'b'],
      partial: ['c'],
      sequenceErrors: ['s1', 's2'],
    },
  }, t)

  assert.equal(details.outcome, 'mixed')
  assert.equal(details.outcomeLabel, 'Review recommended')
  assert.deepEqual(details.weakAyahs, [3, 5])
  assert.equal(details.metrics.length, 0)
  assert.ok(details.detailsMetrics.some((m) => m.key === 'sequence' && /2 slips/.test(m.value)))
  assert.ok(details.highlights.some((h) => h.key === 'weak-ayahs'))
  assert.match(details.focus, /ayahs Ayah 3, Ayah 5|ayahs 3, 5/i)
  assert.match(details.summaryLine, /We clearly matched 3 of 6 words/i)
}

{
  const details = buildAiReviewDetails('strong', { accuracy_percent: 96 }, {
    accuracyScore: 96,
    committedWords: [{ text: 'بسم' }],
    wordStatuses: Array.from({ length: 10 }, () => ({ status: 'correct' })),
  }, t)
  assert.equal(details.accuracy, 96)
  assert.equal(details.metrics.length, 0)
  assert.ok(details.detailsMetrics.length >= 3)
  assert.ok(details.highlights.length >= 1)
  assert.match(details.focus, /Keep this pace/i)
  assert.match(details.summaryLine, /We clearly matched 10 of 10 words/i)
  assert.match(details.summaryLine, /Nice work/i)
}

{
  const hesitation = buildAiReviewDetails('strong', {
    accuracy_percent: 94,
    weak_ayahs: [3],
  }, {
    accuracyScore: 94,
    weakAyahs: [3],
    committedWords: [{ text: 'الحمد' }],
    wordStatuses: Array.from({ length: 8 }, () => ({ status: 'correct' })),
  }, t)
  // Perfect word statuses: do not invent a weak-phrase claim from weak_ayahs alone.
  assert.match(hesitation.summaryLine, /We clearly matched 8 of 8 words/i)
  assert.doesNotMatch(hesitation.summaryLine, /hesitation in Ayah 3/i)
  assert.deepEqual(hesitation.weakAyahs, [])
}

// Valid spoken attempt with 0% match — calm presentation, no Steady order, details behind toggle.
{
  const zeroWords = Array.from({ length: 10 }, () => ({ status: 'incorrect' }))
  assert.equal(classifyRecitationAssessmentQuality({
    accuracyScore: 0,
    transcript: 'بسم الله الرحمن الرحيم',
    committedWords: [{ text: 'بسم' }, { text: 'الله' }],
    wordStatuses: zeroWords,
  }, { accuracy_percent: 0 }), ASSESSMENT_QUALITY.VALID_ZERO_MATCH)

  const details = buildAiReviewDetails('weak', {
    accuracy_percent: 0,
    missed_words: 10,
  }, {
    accuracyScore: 0,
    transcript: 'بسم الله الرحمن الرحيم',
    committedWords: [{ text: 'بسم' }, { text: 'الله' }, { text: 'الرحمن' }],
    wordStatuses: zeroWords,
  }, t)

  assert.equal(details.assessmentQuality, ASSESSMENT_QUALITY.VALID_ZERO_MATCH)
  assert.equal(details.presentationMode, 'valid_zero_match')
  assert.equal(details.accuracy, 0)
  assert.equal(details.progressPercent, 0)
  assert.equal(details.outcomeLabel, 'Needs more practice')
  assert.match(details.summaryLine, /We clearly matched 0 of 10 words/i)
  assert.equal(details.metrics.length, 0, 'primary metric wall hidden for valid 0%')
  assert.equal(details.showDetailsToggle, true)
  assert.ok(details.detailsMetrics.some((m) => m.key === 'accuracy' && m.value === '0%'))
  assert.ok(details.detailsMetrics.some((m) => m.key === 'words' && m.value === '0/10'))
  assert.ok(details.detailsMetrics.some((m) => m.key === 'missed' && m.value === '10'))
  const sequence = details.detailsMetrics.find((m) => m.key === 'sequence')
  assert.ok(sequence)
  assert.match(sequence.label, /Sequence/i)
  assert.match(sequence.value, /Not enough matched words to assess|Not assessed/i)
  assert.doesNotMatch(sequence.value, /Steady/i)
  assert.ok(details.chips.every((chip) => !/Order:\s*Steady/i.test(chip.label)))
}

// Silence — insufficient_audio, never a scored 0%.
{
  assert.equal(classifyRecitationAssessmentQuality({
    noSpeech: true,
    accuracyScore: 0,
    wordStatuses: Array.from({ length: 10 }, () => ({ status: 'pending' })),
  }), ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO)

  const silence = buildAiReviewDetails('weak', {
    accuracy_percent: 0,
    insufficient_audio: true,
  }, {
    noSpeech: true,
    accuracyScore: 0,
    wordStatuses: Array.from({ length: 10 }, () => ({ status: 'pending' })),
  }, t)

  assert.equal(silence.assessmentQuality, ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO)
  assert.equal(silence.presentationMode, 'insufficient_audio')
  assert.equal(silence.accuracy, null)
  assert.equal(silence.progressPercent, null)
  assert.equal(silence.metrics.length, 0)
  assert.equal(silence.detailsMetrics.length, 0)
  assert.match(silence.summaryLine, /couldn.?t assess this attempt/i)
  assert.match(silence.summaryLine, /microphone or connection/i)
  assert.equal(silence.showMicrophoneCheck, false)
  assert.doesNotMatch(JSON.stringify(silence), /"0%"/)
}

// Unusable recording — insufficient_audio.
{
  assert.equal(classifyRecitationAssessmentQuality({
    failureReason: 'unusable_audio',
    accuracyScore: 0,
  }), ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO)

  const unusable = buildAiReviewDetails('weak', { accuracy_percent: 0 }, {
    unusableAudio: true,
    accuracyScore: 0,
    wordStatuses: [],
  }, t)
  assert.equal(unusable.presentationMode, 'insufficient_audio')
  assert.equal(unusable.accuracy, null)
  assert.ok(!unusable.metrics.some((m) => /0%/.test(m.value || '')))
}

// Partial valid match — details behind toggle, Steady allowed when words matched.
{
  assert.equal(classifyRecitationAssessmentQuality({
    accuracyScore: 40,
    committedWords: [{ text: 'الحمد' }],
    wordStatuses: [
      { status: 'correct' }, { status: 'correct' },
      { status: 'incorrect' }, { status: 'incorrect' },
      { status: 'incorrect' },
    ],
  }, { accuracy_percent: 40 }), ASSESSMENT_QUALITY.PARTIAL_MATCH)

  const partial = buildAiReviewDetails('weak', {
    accuracy_percent: 40,
    missed_words: 3,
    sequence_errors: 0,
  }, {
    accuracyScore: 40,
    committedWords: [{ text: 'الحمد' }, { text: 'لله' }],
    wordStatuses: [
      { status: 'correct', confidence: 0.9 }, { status: 'correct', confidence: 0.8 },
      { status: 'incorrect', confidence: 0.5 }, { status: 'incorrect', confidence: 0.4 },
      { status: 'incorrect', confidence: 0.3 },
    ],
  }, t)

  assert.equal(partial.presentationMode, 'standard')
  assert.equal(partial.accuracy, 40)
  assert.equal(partial.metrics.length, 0)
  assert.ok(partial.detailsMetrics.some((m) => m.key === 'accuracy' && m.value === '40%'))
  assert.ok(partial.detailsMetrics.some((m) => m.key === 'words' && m.value === '2/5'))
  const sequence = partial.detailsMetrics.find((m) => m.key === 'sequence')
  assert.equal(sequence.value, 'Steady')
  assert.ok(partial.detailsMetrics.some((m) => m.key === 'confidence'))
  assert.equal(resolveRecognitionConfidence([
    { confidence: 0.9 }, { confidence: 0.7 },
  ]), 80)
}

// Template order: ResultSummary → focus/recommendation → details disclosure.
{
  const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
  const aiReviewStart = vue.indexOf('post-session-simple__ai-review')
  assert.ok(aiReviewStart > 0)
  const slice = vue.slice(aiReviewStart, aiReviewStart + 12000)
  const summaryIdx = slice.indexOf('post-session-simple__ai-review-summary')
  const focusIdx = slice.indexOf('post-session-simple__focus-block')
  const detailsIdx = slice.indexOf('post-session-simple__ai-details')
  assert.ok(summaryIdx > 0)
  assert.ok(focusIdx > summaryIdx, 'focus / recommendation appears after summary')
  assert.ok(detailsIdx > focusIdx, 'details disclosure appears after focus')
  assert.match(slice, /postSessionInlineRecommendationRows|postSessionGuidedMethodRows|postSessionFocusHighlightParts/)
  assert.match(slice, /viewDetails/)
  // Colour meter / metrics only inside expanded details body.
  const meterIdx = slice.indexOf('post-session-simple__check-meter')
  assert.ok(meterIdx > detailsIdx, 'colour meter is behind details')
}

// Responsive height budget: collapsed card stays within common mobile viewports.
{
  const MOBILE_HEIGHTS = [667, 736, 812, 844, 896] // iPhone SE → large phones
  const HEADER = 72
  const FOOTER = 140
  const GUIDE = 48
  // Collapsed estimate: status + 2-line summary + 3 evidence rows + view-details link.
  const COLLAPSED_CARD = 58 /* head */ + 36 /* lead */ + (3 * 40) /* rows */ + 32 /* toggle */
  for (const height of MOBILE_HEIGHTS) {
    const remaining = height - HEADER - FOOTER - GUIDE
    assert.ok(
      COLLAPSED_CARD < remaining * 0.72,
      `collapsed recommendation card (${COLLAPSED_CARD}px) should leave room on ${height}px viewport (budget ${Math.round(remaining * 0.72)}px)`,
    )
    // Recommendation block itself must be visible without expanding details.
    const recommendationVisible = 58 + 36 + (3 * 40)
    assert.ok(
      recommendationVisible < remaining,
      `recommendation rows visible without details on ${height}px`,
    )
  }
}

console.log('ai-review-details.test.mjs: ok')
