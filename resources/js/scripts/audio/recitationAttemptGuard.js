/**
 * Central AI recitation attempt classification.
 *
 * Invalid audio / provider failures must never count as bad memorisation.
 * Only `valid_check` may affect accuracy, session score, recommendations,
 * memorisation progress, or spaced-retention scheduling.
 */

import {
  RECITATION_FAILURE_KIND,
  classifyRecitationFailure,
  isStaleRecitationAttempt,
  validateRecordingBlob,
} from './recordingResilience.js'
import {
  INSUFFICIENT_AUDIO_REASONS,
  RECITATION_RESULT_STATE,
  resolveInsufficientAudioReason,
} from '../recommendations/recitationResultState.js'

export const RECITATION_ATTEMPT_CLASS = Object.freeze({
  VALID_CHECK: 'valid_check',
  SILENCE_NO_SPEECH: 'silence_no_speech',
  RECORDING_TOO_SHORT: 'recording_too_short',
  MICROPHONE_DENIED: 'microphone_denied',
  UNUSABLE_AUDIO: 'unusable_audio',
  EMPTY_LOW_CONFIDENCE_TRANSCRIPT: 'empty_low_confidence_transcript',
  PROVIDER_NETWORK_ERROR: 'provider_network_error',
  CANCELLED_STALE: 'cancelled_stale',
})

export const ATTEMPT_RETRY_KEYS = Object.freeze({
  [RECITATION_ATTEMPT_CLASS.SILENCE_NO_SPEECH]: 'memorisation.aiCheck.retry.silence',
  [RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT]: 'memorisation.aiCheck.retry.tooShort',
  [RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED]: 'memorisation.aiCheck.retry.microphone',
  [RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO]: 'memorisation.aiCheck.retry.unusable',
  [RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT]: 'memorisation.aiCheck.retry.emptyTranscript',
  [RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR]: 'memorisation.aiCheck.retry.provider',
  [RECITATION_ATTEMPT_CLASS.CANCELLED_STALE]: 'memorisation.aiCheck.retry.cancelled',
})

export const ATTEMPT_RETRY_FALLBACKS = Object.freeze({
  [RECITATION_ATTEMPT_CLASS.SILENCE_NO_SPEECH]:
    'We didn’t hear any recitation. Recite clearly, then try again.',
  [RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT]:
    'That recording was too short. Recite a little longer, then try again.',
  [RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED]:
    'Microphone access is blocked. Allow the microphone, then try again.',
  [RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO]:
    'The audio wasn’t clear enough to assess. Recite closer to the microphone, then try again.',
  [RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT]:
    'We couldn’t understand the recitation. Recite clearly, then try again.',
  [RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR]:
    'The recitation service didn’t respond. Your session is safe — try again.',
  [RECITATION_ATTEMPT_CLASS.CANCELLED_STALE]:
    'This check was cancelled. Start a new recording when you are ready.',
})

const REASON_TO_CLASS = Object.freeze({
  [INSUFFICIENT_AUDIO_REASONS.NO_SPEECH]: RECITATION_ATTEMPT_CLASS.SILENCE_NO_SPEECH,
  [INSUFFICIENT_AUDIO_REASONS.SHORT_RECORDING]: RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT,
  [INSUFFICIENT_AUDIO_REASONS.SHORT_SPEECH]: RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT,
  [INSUFFICIENT_AUDIO_REASONS.MIC_PERMISSION]: RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED,
  [INSUFFICIENT_AUDIO_REASONS.UNUSABLE_AUDIO]: RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO,
  [INSUFFICIENT_AUDIO_REASONS.EMPTY_TRANSCRIPT]: RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT,
  [INSUFFICIENT_AUDIO_REASONS.LOW_CONFIDENCE]: RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT,
  [INSUFFICIENT_AUDIO_REASONS.PROCESSING_FAILED]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
  [INSUFFICIENT_AUDIO_REASONS.EXPLICIT]: RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO,
})

const FAILURE_KIND_TO_CLASS = Object.freeze({
  [RECITATION_FAILURE_KIND.MICROPHONE]: RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED,
  [RECITATION_FAILURE_KIND.RECORDING]: RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO,
  [RECITATION_FAILURE_KIND.NETWORK]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
  [RECITATION_FAILURE_KIND.PROVIDER]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
  [RECITATION_FAILURE_KIND.USAGE_CAP]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
  [RECITATION_FAILURE_KIND.RATE_LIMIT]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
  [RECITATION_FAILURE_KIND.TIMEOUT]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
  [RECITATION_FAILURE_KIND.CANCELLED]: RECITATION_ATTEMPT_CLASS.CANCELLED_STALE,
  [RECITATION_FAILURE_KIND.PERMANENT]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
  [RECITATION_FAILURE_KIND.UNKNOWN]: RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR,
})

const BLOB_REASON_TO_CLASS = Object.freeze({
  empty_blob: RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT,
  missing_blob: RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT,
  short_recording: RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT,
  invalid_mime: RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO,
})

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidRecitationCheck(value) {
  return String(value || '').trim() === RECITATION_ATTEMPT_CLASS.VALID_CHECK
}

/**
 * Invalid / provider-failed attempts must not enter accuracy denominators.
 *
 * @param {{ class?: string, validCheck?: boolean }|string|null|undefined} classification
 * @returns {boolean}
 */
export function attemptAffectsScoring(classification) {
  if (classification == null) return false
  if (typeof classification === 'string') return isValidRecitationCheck(classification)
  if (classification.affectsScoring === false || classification.validCheck === false) return false
  if (classification.affectsScoring === true || classification.validCheck === true) {
    return isValidRecitationCheck(classification.class || RECITATION_ATTEMPT_CLASS.VALID_CHECK)
  }
  return isValidRecitationCheck(classification.class)
}

/**
 * Drop stale or duplicate provider responses so they cannot mutate the current attempt.
 *
 * @param {string|null|undefined} activeAttemptId
 * @param {string|null|undefined} responseAttemptId
 * @returns {boolean} true when the response may be applied
 */
export function acceptRecitationProviderResponse(activeAttemptId, responseAttemptId) {
  const active = String(activeAttemptId || '').trim()
  const response = String(responseAttemptId || '').trim()
  if (!active || !response) return false
  return !isStaleRecitationAttempt(active, response)
}

/**
 * @param {string} reason
 * @returns {string}
 */
export function attemptClassFromInsufficientReason(reason = '') {
  const value = String(reason || '').toLowerCase().trim()
  if (REASON_TO_CLASS[value]) return REASON_TO_CLASS[value]
  if (/cancel|stale|superseded|discard/.test(value)) return RECITATION_ATTEMPT_CLASS.CANCELLED_STALE
  if (/mic|permission|denied|notallowed/.test(value)) return RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED
  if (/short|empty_blob|missing_blob|too.?short/.test(value)) return RECITATION_ATTEMPT_CLASS.RECORDING_TOO_SHORT
  if (/empty|transcript|low.?confidence/.test(value)) {
    return RECITATION_ATTEMPT_CLASS.EMPTY_LOW_CONFIDENCE_TRANSCRIPT
  }
  if (/no.?speech|silence/.test(value)) return RECITATION_ATTEMPT_CLASS.SILENCE_NO_SPEECH
  if (/timeout|network|provider|speechmatics|5\d\d|4\d\d|process/.test(value)) {
    return RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR
  }
  if (/unusable|invalid/.test(value)) return RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO
  return RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO
}

/**
 * @param {string} kind
 * @returns {string}
 */
export function attemptClassFromFailureKind(kind = '') {
  return FAILURE_KIND_TO_CLASS[String(kind || '')] || RECITATION_ATTEMPT_CLASS.PROVIDER_NETWORK_ERROR
}

/**
 * @param {string} attemptClass
 * @param {(key: string, fallback?: string) => string} [t]
 * @returns {string}
 */
export function resolveAttemptRetryGuidance(attemptClass, t) {
  const value = String(attemptClass || '').trim()
  if (value === RECITATION_ATTEMPT_CLASS.VALID_CHECK) return ''
  const key = ATTEMPT_RETRY_KEYS[value]
  const fallback = ATTEMPT_RETRY_FALLBACKS[value] || ATTEMPT_RETRY_FALLBACKS[RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO]
  if (typeof t !== 'function' || !key) return fallback
  const translated = String(t(key, fallback) || '').trim()
  if (translated && translated !== key) return translated
  return fallback
}

/**
 * Classify a recitation attempt. Technical / audio failures are never `valid_check`.
 *
 * @param {{
 *   result?: Record<string, unknown>|null,
 *   extras?: Record<string, unknown>,
 *   error?: unknown,
 *   blob?: Blob|null,
 *   durationSeconds?: number|null,
 *   activeAttemptId?: string|null,
 *   responseAttemptId?: string|null,
 *   cancelled?: boolean,
 *   stale?: boolean,
 *   offline?: boolean,
 *   context?: string,
 * }} [input]
 * @returns {{
 *   class: string,
 *   validCheck: boolean,
 *   affectsScoring: boolean,
 *   reason: string|null,
 *   retryable: boolean,
 *   retryGuidance: string,
 *   failureKind: string|null,
 *   resultState: string,
 * }}
 */
export function classifyRecitationAttempt(input = {}) {
  const extras = input.extras && typeof input.extras === 'object' ? input.extras : {}
  const result = input.result && typeof input.result === 'object' ? input.result : null

  if (
    input.cancelled === true
    || extras.cancelled === true
    || result?.cancelled === true
    || extras.discarded === true
  ) {
    return buildAttemptClassification(RECITATION_ATTEMPT_CLASS.CANCELLED_STALE, {
      reason: 'cancelled',
      retryable: false,
      failureKind: RECITATION_FAILURE_KIND.CANCELLED,
    })
  }

  const activeAttemptId = String(input.activeAttemptId ?? extras.activeAttemptId ?? '').trim()
  const responseAttemptId = String(input.responseAttemptId ?? extras.responseAttemptId ?? '').trim()
  if (
    input.stale === true
    || extras.stale === true
    || (activeAttemptId && responseAttemptId && !acceptRecitationProviderResponse(activeAttemptId, responseAttemptId))
  ) {
    return buildAttemptClassification(RECITATION_ATTEMPT_CLASS.CANCELLED_STALE, {
      reason: 'stale',
      retryable: false,
      failureKind: RECITATION_FAILURE_KIND.CANCELLED,
    })
  }

  if (input.error != null) {
    const failure = classifyRecitationFailure(input.error, {
      context: input.context || extras.context || 'recitation',
      offline: input.offline,
    })
    const attemptClass = attemptClassFromFailureKind(failure.kind)
    if (attemptClass !== RECITATION_ATTEMPT_CLASS.VALID_CHECK) {
      return buildAttemptClassification(attemptClass, {
        reason: failure.kind,
        retryable: failure.retryable,
        failureKind: failure.kind,
      })
    }
  }

  if (input.blob !== undefined) {
    const blobCheck = validateRecordingBlob(input.blob, {
      durationSeconds: input.durationSeconds ?? extras.duration_seconds ?? extras.durationSeconds,
    })
    if (!blobCheck.valid) {
      const attemptClass = BLOB_REASON_TO_CLASS[blobCheck.reason]
        || RECITATION_ATTEMPT_CLASS.UNUSABLE_AUDIO
      return buildAttemptClassification(attemptClass, {
        reason: blobCheck.reason || 'unusable_audio',
        retryable: true,
        failureKind: RECITATION_FAILURE_KIND.RECORDING,
      })
    }
  }

  const mergedExtras = {
    ...extras,
    duration_seconds: extras.duration_seconds ?? extras.durationSeconds ?? input.durationSeconds,
  }
  const insufficientReason = resolveInsufficientAudioReason(result, mergedExtras)
  if (insufficientReason) {
    return buildAttemptClassification(attemptClassFromInsufficientReason(insufficientReason), {
      reason: insufficientReason,
      retryable: attemptClassFromInsufficientReason(insufficientReason)
        !== RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED,
      failureKind: insufficientReason === INSUFFICIENT_AUDIO_REASONS.MIC_PERMISSION
        ? RECITATION_FAILURE_KIND.MICROPHONE
        : (insufficientReason === INSUFFICIENT_AUDIO_REASONS.PROCESSING_FAILED
          ? RECITATION_FAILURE_KIND.PROVIDER
          : RECITATION_FAILURE_KIND.RECORDING),
    })
  }

  const explicitClass = String(
    extras.attempt_class
    || extras.attemptClass
    || result?.attemptClass
    || result?.attempt_class
    || '',
  ).trim()
  if (explicitClass && explicitClass !== RECITATION_ATTEMPT_CLASS.VALID_CHECK) {
    if (Object.values(RECITATION_ATTEMPT_CLASS).includes(explicitClass)) {
      return buildAttemptClassification(explicitClass, {
        reason: explicitClass,
        retryable: explicitClass !== RECITATION_ATTEMPT_CLASS.CANCELLED_STALE
          && explicitClass !== RECITATION_ATTEMPT_CLASS.MICROPHONE_DENIED,
      })
    }
  }

  return buildAttemptClassification(RECITATION_ATTEMPT_CLASS.VALID_CHECK, {
    reason: null,
    retryable: false,
    failureKind: null,
  })
}

/**
 * @param {string} attemptClass
 * @param {{ reason?: string|null, retryable?: boolean, failureKind?: string|null }} [meta]
 */
function buildAttemptClassification(attemptClass, meta = {}) {
  const validCheck = attemptClass === RECITATION_ATTEMPT_CLASS.VALID_CHECK
  return {
    class: attemptClass,
    validCheck,
    affectsScoring: validCheck,
    reason: meta.reason ?? (validCheck ? null : attemptClass),
    retryable: validCheck ? false : meta.retryable !== false,
    retryGuidance: resolveAttemptRetryGuidance(attemptClass),
    failureKind: meta.failureKind || null,
    resultState: validCheck
      ? RECITATION_RESULT_STATE.DEVELOPING
      : RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO,
  }
}

export default {
  RECITATION_ATTEMPT_CLASS,
  classifyRecitationAttempt,
  attemptAffectsScoring,
  acceptRecitationProviderResponse,
  resolveAttemptRetryGuidance,
  attemptClassFromInsufficientReason,
  attemptClassFromFailureKind,
  isValidRecitationCheck,
}
