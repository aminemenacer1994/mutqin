import assert from 'node:assert/strict'
import {
  RECITATION_FAILURE_KIND,
  RECITATION_PROCESSING_STAGE,
  classifyRecitationFailure,
  createRecitationAttemptId,
  isStaleRecitationAttempt,
  resolveRecitationFailureMessage,
  userFacingTranscriptionFailure,
  validateRecordingBlob,
  validateRecordingEnvironment,
} from '../../resources/js/scripts/audio/recordingResilience.js'

{
  const env = validateRecordingEnvironment()
  assert.equal(typeof env.supported, 'boolean')
}

{
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' })
  assert.equal(validateRecordingBlob(blob, { durationSeconds: 2 }).valid, true)
  assert.equal(validateRecordingBlob(blob, { durationSeconds: 0.5 }).valid, false)
  assert.equal(validateRecordingBlob(null).valid, false)
  assert.equal(validateRecordingBlob(new Blob([], { type: 'audio/webm' })).valid, false)
}

{
  const first = createRecitationAttemptId()
  const second = createRecitationAttemptId()
  assert.notEqual(first, second)
  assert.equal(isStaleRecitationAttempt(first, first), false)
  assert.equal(isStaleRecitationAttempt(first, second), true)
  // Empty active id must not be treated as "matching" a real response id by callers;
  // isStale itself returns false when either side is empty, so consumers must guard.
  assert.equal(isStaleRecitationAttempt('', first), false)
  assert.equal(isStaleRecitationAttempt(first, ''), false)
}

{
  const mic = classifyRecitationFailure({ name: 'NotAllowedError', message: 'Permission denied' })
  assert.equal(mic.kind, RECITATION_FAILURE_KIND.MICROPHONE)
  assert.equal(mic.retryable, false)

  const network = classifyRecitationFailure({ message: 'Failed to fetch' }, { offline: true })
  assert.equal(network.kind, RECITATION_FAILURE_KIND.NETWORK)

  const provider = classifyRecitationFailure({ message: 'Speechmatics websocket closed' })
  assert.equal(provider.kind, RECITATION_FAILURE_KIND.PROVIDER)

  const usageCap = classifyRecitationFailure({
    response: {
      status: 429,
      data: {
        available: false,
        reason: 'usage_cap',
        message: 'You have reached today\'s AI voice-check limit. Please try again tomorrow.',
      },
    },
  })
  assert.equal(usageCap.kind, RECITATION_FAILURE_KIND.USAGE_CAP)
  assert.equal(usageCap.retryable, false)
  assert.equal(usageCap.messageKey, 'memorisation.aiCheck.usageCapReached')

  const timeout = classifyRecitationFailure({ message: 'Recording timed out before audio was ready' })
  assert.equal(timeout.kind, RECITATION_FAILURE_KIND.TIMEOUT)
}

{
  const t = (key) => (key === 'memorisation.aiCheck.micRequired'
    ? 'Microphone access is required for AI Recitation.'
    : key)
  const micMessage = resolveRecitationFailureMessage(t, {
    kind: RECITATION_FAILURE_KIND.MICROPHONE,
    messageKey: 'memorisation.aiCheck.micRequired',
  })
  assert.equal(micMessage, 'Microphone access is required for AI Recitation.')

  const providerMessage = userFacingTranscriptionFailure({
    response: { status: 422, data: { reason: 'unavailable', message: 'Voice checking could not start right now. Please try again later.' } },
  })
  assert.match(providerMessage, /temporarily unavailable/i)
  assert.doesNotMatch(providerMessage, /SPEECHMATICS_API_KEY/i)

  const capMessage = userFacingTranscriptionFailure({
    response: {
      status: 429,
      data: { reason: 'usage_cap', message: 'Speechmatics daily_user_token_mints exhausted' },
    },
  })
  assert.match(capMessage, /voice-check limit/i)
  assert.doesNotMatch(capMessage, /speechmatics/i)
  assert.doesNotMatch(capMessage, /token_mints/i)
}

{
  assert.equal(RECITATION_PROCESSING_STAGE.RECORDING, 'recording')
  assert.equal(RECITATION_PROCESSING_STAGE.ASSESSING, 'assessing')
}

console.log('Recording resilience tests passed')
