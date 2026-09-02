import assert from 'node:assert/strict'
import {
  RECITATION_ATTEMPT_CLASS,
  acceptRecitationProviderResponse,
  attemptAffectsScoring,
  classifyRecitationAttempt,
  resolveAttemptRetryGuidance,
} from '../../resources/js/scripts/audio/recitationAttemptGuard.js'
import { RECITATION_FAILURE_KIND, classifyRecitationFailure, validateRecordingBlob } from '../../resources/js/scripts/audio/recordingResilience.js'
import { applyRecitationMasteryFromResult } from '../../resources/js/scripts/recommendations/recitationMastery.js'
import { RECITATION_RESULT_STATE, resolveRecitationResultState } from '../../resources/js/scripts/recommendations/recitationResultState.js'

const memory = new Map()
globalThis.__MUTQIN_STORAGE_BRIDGE__ = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null
  },
  setItem(key, value) {
    memory.set(key, value)
  },
  removeItem(key) {
    memory.delete(key)
  },
}

function spokenWrongResult(overrides = {}) {
  return {
    transcript: 'قل هو الله احد',
    committedWords: [
      { text: 'قل', confidence: 0.92, start: 0.2, end: 0.5 },
      { text: 'هو', confidence: 0.9, start: 0.5, end: 0.8 },
      { text: 'الله', confidence: 0.91, start: 0.8, end: 1.2 },
      { text: 'احد', confidence: 0.88, start: 1.2, end: 1.7 },
    ],
    durationSeconds: 6,
    accuracyScore: 20,
    wordStatuses: [
      { status: 'incorrect' },
      { status: 'incorrect' },
      { status: 'incorrect' },
      { status: 'incorrect' },
    ],
    ...overrides,
  }
}

function assertInvalid(classification, expectedClass) {
  assert.equal(classification.class, expectedClass)
  assert.equal(classification.validCheck, false)
  assert.equal(classification.affectsScoring, false)
  assert.equal(attemptAffectsScoring(classification), false)
  assert.equal(classification.resultState, RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO)
  assert.ok(String(classification.retryGuidance || '').length > 8)
}

{
  const silence = classifyRecitationAttempt({
    result: {
      noSpeech: true,
      transcript: '',
      committedWords: [],
      accuracyScore: 0,
      durationSeconds: 4,
      wordStatuses: Array.from({ length: 6 }, () => ({ status: 'omitted' })),
    },
  })
  assertInvalid(silence, RECITATION_ATTEMPT_CLASS.SILENCE_NO_SPEECH)
  assert.match(silence.retryGuidance, /didn.?t hear any recitation/i)
  assert.equal(applyRecitationMasteryFromResult({
    result: { noSpeech: true, accuracyScore: 0, transcript: '' },
    outcome: 'weak',
    accuracyPercent: 0,
    range: { surahId: 1, from: 1, to: 1 },
  }).length, 0)
}

{
  const emptyBlob = classifyRecitationAttempt({
    blob: new Blob([], { type: 'audio/webm' }),
    durationSeconds: 0,
  })
  assertInvalid(emptyBlob, RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT)
  assert.equal(validateRecordingBlob(new Blob([], { type: 'audio/webm' })).reason, 'empty_blob')

  const tooShort = classifyRecitationAttempt({
    result: {
      transcript: 'الحمد',
      committedWords: [{ text: 'الحمد', confidence: 0.9, start: 0, end: 0.2 }],
      durationSeconds: 0.4,
    },
    extras: { duration_seconds: 0.4 },
  })
  assertInvalid(tooShort, RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT)
  assert.match(tooShort.retryGuidance, /too short/i)
}

{
  const mic = classifyRecitationAttempt({
    error: { name: 'NotAllowedError', message: 'Permission denied' },
  })
  assertInvalid(mic, RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED)
  assert.equal(mic.retryable, false)
  assert.match(mic.retryGuidance, /microphone/i)
  assert.equal(
    classifyRecitationFailure({ name: 'NotAllowedError', message: 'Permission denied' }).kind,
    RECITATION_FAILURE_KIND.MICROPHONE,
  )
}

{
  const emptyTranscript = classifyRecitationAttempt({
    result: {
      transcript: '',
      committedWords: [],
      accuracyScore: 0,
      wordStatuses: Array.from({ length: 8 }, () => ({ status: 'omitted' })),
    },
  })
  assertInvalid(emptyTranscript, RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT)
  assert.match(emptyTranscript.retryGuidance, /couldn.?t understand|recite clearly/i)
}

{
  const lowConfidence = classifyRecitationAttempt({
    result: {
      transcript: 'xyz',
      committedWords: [
        { text: 'xyz', confidence: 0.1 },
        { text: 'abc', confidence: 0.12 },
      ],
      durationSeconds: 5,
      wordStatuses: [{ status: 'pending' }, { status: 'pending' }],
    },
  })
  assertInvalid(lowConfidence, RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT)
}

{
  const timeout = classifyRecitationAttempt({
    error: { message: 'Recording timed out before audio was ready' },
  })
  assertInvalid(timeout, RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR)
  assert.equal(timeout.failureKind, RECITATION_FAILURE_KIND.TIMEOUT)
  assert.match(timeout.retryGuidance, /didn.?t respond|try again/i)

  const provider5xx = classifyRecitationAttempt({
    error: { response: { status: 503, data: { message: 'Speechmatics unavailable' } } },
  })
  assertInvalid(provider5xx, RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR)
  assert.equal(classifyRecitationFailure({ response: { status: 500 } }).kind, RECITATION_FAILURE_KIND.PROVIDER)

  const provider4xx = classifyRecitationAttempt({
    error: { response: { status: 401, data: { message: 'not_authorised' } } },
  })
  assertInvalid(provider4xx, RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR)
}

{
  const cancelled = classifyRecitationAttempt({
    cancelled: true,
    result: spokenWrongResult(),
  })
  assertInvalid(cancelled, RECITATION_ATTEMPT_CLASS.CANCELLED_STALE)
  assert.equal(cancelled.retryable, false)

  const abort = classifyRecitationAttempt({
    error: { name: 'AbortError', message: 'The operation was aborted' },
  })
  assertInvalid(abort, RECITATION_ATTEMPT_CLASS.CANCELLED_STALE)
  assert.equal(classifyRecitationFailure({ name: 'AbortError', message: 'aborted' }).kind, RECITATION_FAILURE_KIND.CANCELLED)
}

{
  const first = 'recitation-1'
  const second = 'recitation-2'
  assert.equal(acceptRecitationProviderResponse(first, first), true)
  assert.equal(acceptRecitationProviderResponse(first, second), false)
  assert.equal(acceptRecitationProviderResponse('', first), false)
  assert.equal(acceptRecitationProviderResponse(first, ''), false)

  const stale = classifyRecitationAttempt({
    result: spokenWrongResult(),
    activeAttemptId: first,
    responseAttemptId: second,
  })
  assertInvalid(stale, RECITATION_ATTEMPT_CLASS.CANCELLED_STALE)
  assert.equal(stale.reason, 'stale')
}

{
  const validWrong = classifyRecitationAttempt({ result: spokenWrongResult() })
  assert.equal(validWrong.class, RECITATION_ATTEMPT_CLASS.VALID_CHECK)
  assert.equal(validWrong.validCheck, true)
  assert.equal(validWrong.affectsScoring, true)
  assert.equal(validWrong.retryGuidance, '')
  assert.equal(resolveRecitationResultState(spokenWrongResult()), RECITATION_RESULT_STATE.NEEDS_PRACTICE)
  assert.notEqual(resolveAttemptRetryGuidance(RECITATION_ATTEMPT_CLASS.VALID_CHECK), resolveAttemptRetryGuidance(RECITATION_ATTEMPT_CLASS.SILENCE_NO_SPEECH))
}

{
  const unusable = classifyRecitationAttempt({
    result: { unusableAudio: true, accuracyScore: 0 },
  })
  assertInvalid(unusable, RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO)
}

console.log('recitation-attempt-guard.test.mjs: ok')
