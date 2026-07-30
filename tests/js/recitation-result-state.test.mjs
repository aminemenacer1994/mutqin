import assert from 'node:assert/strict'
import {
  INSUFFICIENT_AUDIO_REASONS,
  RECITATION_AUDIO_THRESHOLDS,
  RECITATION_RESULT_STATE,
  buildInsufficientAudioResult,
  resolveInsufficientAudioReason,
  resolveRecitationResultState,
  resultStateToLegacyOutcome,
} from '../../resources/js/scripts/recommendations/recitationResultState.js'
import {
  ASSESSMENT_QUALITY,
  buildAiReviewDetails,
  classifyRecitationAssessmentQuality,
} from '../../resources/js/scripts/recommendations/aiReviewDetails.js'
import {
  POST_SESSION_CTA_ACTIONS,
  POST_SESSION_CTA_STATES,
  mapPostSessionCtas,
  resolvePostSessionCtaState,
} from '../../resources/js/scripts/recommendations/postSessionCtaMapping.js'

const t = (key, params = {}) => {
  const map = {
    'memorisation.postSession.recommendation.aiMetricAccuracy': 'Match',
    'memorisation.postSession.recommendation.aiMetricWords': 'Words',
    'memorisation.postSession.recommendation.aiMetricMissed': 'Missed',
    'memorisation.postSession.recommendation.aiMetricOrder': 'Order',
    'memorisation.postSession.recommendation.aiMetricOrderSteady': 'Steady',
    'memorisation.postSession.recommendation.aiMetricOrderIssues': `${params.count} slips`,
    'memorisation.postSession.recommendation.aiMetricOrderNotAssessed': 'Not assessed',
    'memorisation.postSession.recommendation.aiOutcomeStrong': 'Strong',
    'memorisation.postSession.recommendation.aiOutcomeMixed': 'Developing',
    'memorisation.postSession.recommendation.aiOutcomeWeak': 'Needs practice',
    'memorisation.postSession.recommendation.confidenceNeedsPractice': 'Needs more practice',
    'memorisation.postSession.recommendation.aiHighlightStrongRecall': 'Most words landed cleanly.',
    'memorisation.postSession.recommendation.aiHighlightMissedWords': `${params.count} words still need another careful pass.`,
    'memorisation.postSession.recommendation.aiHighlightWeak': 'Several spots need support.',
    'memorisation.postSession.recommendation.aiHighlightMixed': 'Solid overall, with a few gaps.',
    'memorisation.postSession.recommendation.aiFocusMissed': `Return to the ${params.count} missed words.`,
    'memorisation.postSession.recommendation.aiFocusRetry': 'Rebuild ayah by ayah.',
    'memorisation.postSession.recommendation.aiResultLineStrong': 'Strong overall — most of the range landed cleanly.',
    'memorisation.postSession.recommendation.aiResultLineMixed': 'Solid overall, with a few gaps to tighten.',
    'memorisation.postSession.recommendation.aiResultLineWeak': 'Needs another pass — several spots still need support.',
    'memorisation.postSession.recommendation.insufficientAudioStatus': 'We could not assess this attempt',
    'memorisation.postSession.recommendation.insufficientAudioSummary': 'We did not hear enough clear recitation to assess this attempt. Please try again.',
    'memorisation.postSession.recommendation.insufficientAudioMicSummary': 'Microphone access is blocked. Allow the microphone, then try recording again.',
    'memorisation.postSession.recommendation.insufficientAudioShortSummary': 'That recording was too short to assess. Recite a little longer, then try again.',
    'memorisation.postSession.recommendation.insufficientAudioProcessingSummary': 'We could not process this recording. Please try recording again.',
    'memorisation.postSession.recommendation.insufficientAudioHint': 'Recite clearly into the microphone, then try recording again.',
    'memorisation.postSession.recommendation.insufficientAudioFocus': 'Check your microphone, then try recording again.',
  }
  return map[key] || key
}

function assertInsufficientPresentation(details, summaryPattern = /did not hear enough|microphone|try again|too short|could not process/i) {
  assert.equal(details.resultState, RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.equal(details.presentationMode, 'insufficient_audio')
  assert.equal(details.accuracy, null)
  assert.equal(details.progressPercent, null)
  assert.equal(details.metrics.length, 0)
  assert.equal(details.detailsMetrics.length, 0)
  assert.equal(details.chips.length, 0)
  assert.equal(details.weakAyahs.length, 0)
  assert.match(details.outcomeLabel, /could not assess this attempt/i)
  assert.match(details.summaryLine, summaryPattern)
  assert.doesNotMatch(JSON.stringify(details), /Order:\s*Steady|"0%"/)
}

// Silence — no speech detected.
{
  assert.equal(resolveRecitationResultState({
    noSpeech: true,
    accuracyScore: 0,
    wordStatuses: Array.from({ length: 10 }, () => ({ status: 'pending' })),
  }), RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.equal(resolveInsufficientAudioReason({ noSpeech: true }), INSUFFICIENT_AUDIO_REASONS.NO_SPEECH)

  const details = buildAiReviewDetails('weak', { accuracy_percent: 0 }, {
    noSpeech: true,
    accuracyScore: 0,
    wordStatuses: Array.from({ length: 10 }, () => ({ status: 'omitted' })),
  }, t)
  assertInsufficientPresentation(details)
  assert.equal(classifyRecitationAssessmentQuality({ noSpeech: true }), ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO)
}

// Empty transcript / no recognised words — never needs_practice.
{
  const empty = {
    transcript: '',
    committedWords: [],
    accuracyScore: 0,
    wordStatuses: Array.from({ length: 10 }, () => ({ status: 'omitted' })),
    colorCounts: { green: 0, amber: 0, red: 0, black: 10, gray: 0 },
  }
  assert.equal(resolveRecitationResultState(empty), RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.equal(resolveInsufficientAudioReason(empty), INSUFFICIENT_AUDIO_REASONS.EMPTY_TRANSCRIPT)

  const details = buildAiReviewDetails('weak', {
    accuracy_percent: 0,
    missed_words: 10,
    sequence_errors: 0,
  }, empty, t)
  assertInsufficientPresentation(details)
  assert.ok(!details.metrics.some((m) => m.key === 'sequence'))
}

// Microphone permission denied.
{
  assert.equal(resolveRecitationResultState({
    micPermissionFailed: true,
    failureReason: 'microphone_denied',
  }), RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.equal(
    resolveInsufficientAudioReason({ micDenied: true }),
    INSUFFICIENT_AUDIO_REASONS.MIC_PERMISSION,
  )

  const details = buildAiReviewDetails('insufficient_audio', {}, buildInsufficientAudioResult({
    reason: INSUFFICIENT_AUDIO_REASONS.MIC_PERMISSION,
    micPermissionFailed: true,
  }), t)
  assertInsufficientPresentation(details)
}

// Recording too short.
{
  assert.ok(RECITATION_AUDIO_THRESHOLDS.minRecordingSeconds > 0)
  assert.equal(resolveRecitationResultState({
    transcript: 'الحمد',
    committedWords: [{ text: 'الحمد', confidence: 0.9, start: 0, end: 0.2 }],
    durationSeconds: 0.4,
  }, { duration_seconds: 0.4 }), RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.equal(resolveInsufficientAudioReason({
    durationSeconds: 0.4,
  }), INSUFFICIENT_AUDIO_REASONS.SHORT_RECORDING)

  const details = buildAiReviewDetails('weak', { duration_seconds: 0.5 }, {
    durationSeconds: 0.5,
    failureReason: 'short_recording',
  }, t)
  assertInsufficientPresentation(details)
}

// AMD live completions often omit duration (or coerce it to 0). That must NOT
// discard a spoken attempt — previously every Test-with-AI finish looked like
// "not enough recitation".
{
  assert.equal(resolveInsufficientAudioReason({
    durationSeconds: 0,
    transcript: 'بسم الله',
    committedWords: [{ text: 'بسم', confidence: 0.9 }],
    wordStatuses: [{ status: 'correct' }, { status: 'incorrect' }, { status: 'omitted' }],
    accuracyScore: 40,
  }, { duration_seconds: 0 }), null)

  assert.equal(resolveInsufficientAudioReason({
    wordStatuses: [{ status: 'correct' }, { status: 'partial' }, { status: 'incorrect' }],
    accuracyScore: 55,
  }), null)

  assert.equal(resolveRecitationResultState({
    durationSeconds: 0,
    wordStatuses: [
      { status: 'correct' }, { status: 'incorrect' }, { status: 'omitted' },
    ],
    accuracyScore: 40,
    transcript: 'بسم',
    committedWords: [{ text: 'بسم', confidence: 0.8 }],
  }, { duration_seconds: 0 }), RECITATION_RESULT_STATE.NEEDS_PRACTICE)
}

// Audio processing failure.
{
  assert.equal(resolveRecitationResultState({
    processingFailed: true,
    failureReason: 'processing_failed',
  }), RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)

  const details = buildAiReviewDetails('weak', {}, {
    processingFailed: true,
    error: 'audio processing failed',
  }, t)
  assertInsufficientPresentation(details)
}

// Low recognition confidence — not fair to assess when there is no spoken status evidence.
{
  assert.equal(resolveRecitationResultState({
    transcript: 'xyz',
    committedWords: [
      { text: 'xyz', confidence: 0.1 },
      { text: 'abc', confidence: 0.12 },
    ],
    durationSeconds: 5,
    wordStatuses: [{ status: 'pending' }, { status: 'pending' }],
  }), RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.equal(resolveInsufficientAudioReason({
    committedWords: [{ text: 'xyz', confidence: 0.1 }],
    durationSeconds: 5,
  }), INSUFFICIENT_AUDIO_REASONS.LOW_CONFIDENCE)

  // But once live colouring already marked words incorrect/partial, assess the attempt.
  assert.equal(resolveInsufficientAudioReason({
    transcript: 'xyz',
    committedWords: [
      { text: 'xyz', confidence: 0.1 },
      { text: 'abc', confidence: 0.12 },
    ],
    durationSeconds: 5,
    wordStatuses: [{ status: 'incorrect' }, { status: 'incorrect' }],
  }), null)
  assert.equal(resolveRecitationResultState({
    transcript: 'xyz',
    committedWords: [
      { text: 'xyz', confidence: 0.1 },
      { text: 'abc', confidence: 0.12 },
    ],
    durationSeconds: 5,
    wordStatuses: [{ status: 'incorrect' }, { status: 'incorrect' }],
    accuracyScore: 0,
  }), RECITATION_RESULT_STATE.NEEDS_PRACTICE)
}

// Genuine valid low-scoring attempt — needs_practice with scores, not insufficient.
{
  const lowScore = {
    transcript: 'بسم الله الرحمن الرحيم',
    committedWords: [
      { text: 'بسم', confidence: 0.9 },
      { text: 'الله', confidence: 0.88 },
      { text: 'الرحمن', confidence: 0.86 },
    ],
    accuracyScore: 40,
    durationSeconds: 8,
    wordStatuses: [
      { status: 'correct' }, { status: 'correct' },
      { status: 'incorrect' }, { status: 'incorrect' },
      { status: 'incorrect' },
    ],
  }
  assert.equal(resolveRecitationResultState(lowScore), RECITATION_RESULT_STATE.NEEDS_PRACTICE)
  assert.equal(resultStateToLegacyOutcome(RECITATION_RESULT_STATE.NEEDS_PRACTICE), 'weak')
  assert.equal(classifyRecitationAssessmentQuality(lowScore, { accuracy_percent: 40 }), ASSESSMENT_QUALITY.PARTIAL_MATCH)

  const details = buildAiReviewDetails('weak', {
    accuracy_percent: 40,
    missed_words: 3,
    sequence_errors: 0,
  }, lowScore, t)

  assert.equal(details.resultState, RECITATION_RESULT_STATE.NEEDS_PRACTICE)
  assert.equal(details.presentationMode, 'standard')
  assert.equal(details.accuracy, 40)
  assert.equal(details.metrics.length, 0, 'primary metric wall stays hidden on compact card')
  assert.ok(details.detailsMetrics.some((m) => m.key === 'accuracy' && m.value === '40%'))
  assert.ok(details.detailsMetrics.some((m) => m.key === 'words' && m.value === '2/5'))
  assert.ok(details.detailsMetrics.some((m) => m.key === 'missed' && m.value === '3'))
  const sequence = details.detailsMetrics.find((m) => m.key === 'sequence')
  assert.equal(sequence.value, 'Steady')
  assert.match(details.outcomeLabel, /Needs practice|Needs more practice/i)
}

// Developing / strong banding.
{
  assert.equal(resolveRecitationResultState({
    transcript: 'الحمد',
    committedWords: [{ text: 'الحمد', confidence: 0.9 }],
    accuracyScore: 70,
    durationSeconds: 6,
    wordStatuses: [{ status: 'correct' }, { status: 'partial' }, { status: 'incorrect' }],
  }), RECITATION_RESULT_STATE.DEVELOPING)

  assert.equal(resolveRecitationResultState({
    transcript: 'الحمد لله',
    committedWords: [{ text: 'الحمد', confidence: 0.95 }, { text: 'لله', confidence: 0.94 }],
    accuracyScore: 92,
    durationSeconds: 5,
    wordStatuses: Array.from({ length: 5 }, () => ({ status: 'correct' })),
  }), RECITATION_RESULT_STATE.STRONG)
}

// CTA mapping for insufficient_audio.
{
  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'insufficient_audio',
  }), POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO)

  const buttons = mapPostSessionCtas(POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO)
  assert.deepEqual(buttons.map((b) => [b.variant, b.action, b.labelKey]), [
    ['primary', POST_SESSION_CTA_ACTIONS.TRY_RECORDING_AGAIN, 'tryRecordingAgain'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CLOSE, 'close'],
  ])

  const micButtons = mapPostSessionCtas(POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO, {
    insufficientReason: 'mic_permission',
  })
  assert.deepEqual(micButtons.map((b) => [b.variant, b.action, b.labelKey]), [
    ['primary', POST_SESSION_CTA_ACTIONS.TRY_RECORDING_AGAIN, 'tryRecordingAgain'],
    ['secondary', POST_SESSION_CTA_ACTIONS.CHECK_MICROPHONE, 'checkMicrophone'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CLOSE, 'close'],
  ])
}

console.log('recitation-result-state.test.mjs: ok')
