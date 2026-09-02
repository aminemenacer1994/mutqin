import assert from 'node:assert/strict'
import {
  buildDeterministicRecitationResult,
  classifyRecitationWordColor,
  cleanRecitationDisplayText,
  normalizeArabicForRecitation,
  RECITATION_THRESHOLDS,
} from '../../resources/js/scripts/engine/recitation_analysis.js'
import {
  RECITATION_FAILURE_KIND,
  buildRecitationProviderLogMetadata,
  classifyRecitationFailure,
  isStaleRecitationAttempt,
} from '../../resources/js/scripts/audio/recordingResilience.js'
import {
  RECITATION_ATTEMPT_CLASS,
  acceptRecitationProviderResponse,
  classifyRecitationAttempt,
} from '../../resources/js/scripts/audio/recitationAttemptGuard.js'
import {
  RECITATION_RESULT_STATE,
  resolveRecitationResultState,
} from '../../resources/js/scripts/recommendations/recitationResultState.js'
import { recitationPipelineFixtures as fixtures } from './fixtures/recitation-pipeline-fixtures.mjs'

function statusList(result) {
  return (result.wordStatuses || []).map((word) => String(word.status))
}

function statusByTarget(result) {
  return Object.fromEntries(
    (result.wordStatuses || []).map((word) => [word.targetWord || word.text, word.status]),
  )
}

// --- Perfect recitation ---
{
  const fx = fixtures.perfect
  const result = buildDeterministicRecitationResult(fx.targetText, fx.recognitionWords)
  assert.deepEqual(statusList(result), fx.expected.statuses)
  assert.ok(result.accuracyScore >= fx.expected.minAccuracy)
  assert.equal(
    resolveRecitationResultState(result, {
      duration_seconds: fx.durationSeconds,
      confidence: result.confidence,
    }),
    RECITATION_RESULT_STATE.STRONG,
  )
  assert.equal(classifyRecitationWordColor('correct'), 'green')
}

// --- Minor / soft-letter variation stays amber ---
{
  const fx = fixtures.minorVariation
  const result = buildDeterministicRecitationResult(fx.targetText, fx.recognitionWords)
  assert.deepEqual(statusList(result), fx.expected.statuses)
  assert.equal(classifyRecitationWordColor('partial'), fx.expected.colorForPartial)
  assert.ok(result.accuracyScore <= fx.expected.maxAccuracy)
}

// --- Clear word error ---
{
  const fx = fixtures.clearWordError
  const result = buildDeterministicRecitationResult(fx.targetText, fx.recognitionWords)
  assert.deepEqual(statusList(result), fx.expected.statuses)
  assert.ok(result.mistakes.incorrect.some(
    (item) => item.actual === fx.expected.mistakenActual
      && (item.expected === fx.expected.mistakenTarget || item.expected.includes('أحد') || item.expected.includes('احد')),
  ))
  assert.equal(classifyRecitationWordColor('incorrect'), fx.expected.colorForMistake)
}

// --- Skipped word ---
{
  const fx = fixtures.skippedWord
  const result = buildDeterministicRecitationResult(fx.targetText, fx.recognitionWords)
  assert.deepEqual(statusList(result), fx.expected.statuses)
  assert.ok(result.mistakes.missing.includes(fx.expected.omittedTarget)
    || statusByTarget(result)[fx.expected.omittedTarget] === 'omitted')
  assert.equal(classifyRecitationWordColor('omitted'), fx.expected.colorForOmitted)
  assert.equal(classifyRecitationWordColor('missing'), 'black')
  assert.equal(classifyRecitationWordColor('minor_mistake'), 'amber')
}

// --- Silence ---
{
  const fx = fixtures.silence
  const classification = classifyRecitationAttempt({
    result: {
      noSpeech: true,
      transcript: '',
      committedWords: [],
      durationSeconds: fx.durationSeconds,
      wordStatuses: Array.from({ length: 4 }, () => ({ status: 'omitted' })),
    },
  })
  assert.equal(classification.class, fx.expected.attemptClass)
  assert.equal(classification.validCheck, fx.expected.validCheck)
  assert.equal(classification.resultState, fx.expected.resultState)
  assert.ok(String(classification.retryGuidance || '').length > 8)
}

// --- Low confidence → uncertain, not learner mistake ---
{
  const fx = fixtures.lowConfidence
  const result = buildDeterministicRecitationResult(fx.targetText, fx.recognitionWords)
  assert.equal(statusByTarget(result)['هو'], fx.expected.statusAt['هو'])
  assert.ok(!(result.mistakes?.incorrect || []).some((item) => item.expected === 'هو'))
}

// --- Do not fabricate strong when provider confidence is insufficient ---
{
  const fx = fixtures.lowConfidenceFabricatedCorrect
  const result = buildDeterministicRecitationResult(fx.targetText, fx.recognitionWords)
  // Exact tokens may still paint correct, but banding must not claim strong
  // when evaluation / recognition confidence is below the central floor.
  const state = resolveRecitationResultState(
    { ...result, confidence: 0.3, recognitionConfidence: 0.2 },
    {
      duration_seconds: fx.durationSeconds,
      confidence: 0.3,
    },
  )
  assert.notEqual(state, RECITATION_RESULT_STATE.STRONG)
  assert.ok(0.3 < RECITATION_THRESHOLDS.minEvaluationConfidenceForStrong)
}

// --- Provider failure ---
{
  const fx = fixtures.providerFailure
  const failure = classifyRecitationFailure(fx.error)
  assert.equal(failure.kind, RECITATION_FAILURE_KIND.PROVIDER)
  assert.equal(failure.retryable, fx.expected.retryable)
  const classification = classifyRecitationAttempt({ error: fx.error })
  assert.equal(classification.class, fx.expected.attemptClass)
  assert.equal(classification.validCheck, fx.expected.validCheck)
  assert.ok(String(classification.retryGuidance || '').length > 8)
}

// --- Too-short recording ---
{
  const fx = fixtures.shortRecording
  const classification = classifyRecitationAttempt({
    result: {
      transcript: 'قل',
      committedWords: fx.recognitionWords,
      durationSeconds: fx.durationSeconds,
    },
    extras: { duration_seconds: fx.durationSeconds },
  })
  assert.equal(classification.class, fx.expected.attemptClass)
  assert.equal(classification.validCheck, fx.expected.validCheck)
}

// --- Stale response must not update current attempt ---
{
  const fx = fixtures.staleAttempt
  assert.equal(
    acceptRecitationProviderResponse(fx.activeAttemptId, fx.responseAttemptId),
    fx.expected.accept,
  )
  assert.equal(isStaleRecitationAttempt(fx.activeAttemptId, fx.responseAttemptId), true)
  const classification = classifyRecitationAttempt({
    activeAttemptId: fx.activeAttemptId,
    responseAttemptId: fx.responseAttemptId,
  })
  assert.equal(classification.class, fx.expected.attemptClass)
}

// --- Normalization: display keeps harakat; compare folds orthography / punctuation ---
{
  const fx = fixtures.punctuationOrthography
  const display = cleanRecitationDisplayText(fx.displayText)
  assert.ok(/[َُِّْ]/.test(display) || display.includes('قُل'), 'display path keeps Qur’anic marks')
  assert.equal(
    normalizeArabicForRecitation(fx.compareLeft),
    normalizeArabicForRecitation(fx.compareRight),
  )
  // Display must not be the stripped comparison form.
  assert.notEqual(display, normalizeArabicForRecitation(fx.displayText))
}

// --- Provider metadata logging never carries audio ---
{
  const meta = buildRecitationProviderLogMetadata({
    attemptId: 'recitation-9',
    provider: 'speechmatics',
    latencyMs: 1234.6,
    meanConfidence: 0.9123,
    wordCount: 4,
    stage: 'assessing',
    audioBlob: { size: 99999 },
    transcript: 'قل هو الله أحد',
  })
  assert.equal(meta.attemptId, 'recitation-9')
  assert.equal(meta.provider, 'speechmatics')
  assert.equal(meta.latencyMs, 1235)
  assert.equal(meta.meanConfidence, 0.912)
  assert.equal(meta.wordCount, 4)
  assert.equal(meta.audioBlob, undefined)
  assert.equal(meta.transcript, undefined)
  assert.ok(!('audioBlob' in meta))
  assert.ok(!('transcript' in meta))
}

// --- Central thresholds stay testable ---
{
  assert.equal(RECITATION_THRESHOLDS.correctSimilarity, 0.79)
  assert.equal(RECITATION_THRESHOLDS.partialSimilarity, 0.48)
  assert.equal(RECITATION_THRESHOLDS.uncertainConfidence, 0.55)
  assert.equal(RECITATION_THRESHOLDS.minEvaluationConfidenceForStrong, 0.45)
  assert.ok(RECITATION_THRESHOLDS.softSimilarityCap < RECITATION_THRESHOLDS.correctSimilarity)
}

console.log('recitation-pipeline tests passed')
