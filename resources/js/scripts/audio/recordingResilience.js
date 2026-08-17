/**
 * Shared microphone / recording / assessment resilience for AI Recite and AMD.
 * Keeps provider-specific failures out of learner-facing copy.
 */

import { RECITATION_AUDIO_THRESHOLDS } from '../recommendations/recitationResultState.js'
import { chooseSupportedRecorderMimeType } from './recordingPlayback.js'

export const RECITATION_PROCESSING_STAGE = Object.freeze({
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  ASSESSING: 'assessing',
  COMPLETE: 'complete',
  ERROR: 'error',
})

export const RECITATION_FAILURE_KIND = Object.freeze({
  MICROPHONE: 'microphone',
  RECORDING: 'recording',
  NETWORK: 'network',
  PROVIDER: 'provider',
  TIMEOUT: 'timeout',
  PERMANENT: 'permanent',
  UNKNOWN: 'unknown',
})

/** Show "taking longer than expected" after this delay during submit/settle. */
export const RECITATION_SLOW_PROCESSING_MS = 8000

/** Default submit race — aligned with Memorisation.js AMD/recite paths. */
export const RECITATION_SUBMIT_TIMEOUT_MS = 12000
export const RECITATION_AMD_SUBMIT_TIMEOUT_MS = 20000

const PERMANENT_HTTP_STATUSES = new Set([400, 401, 403, 404, 422])

const USER_MESSAGE_KEYS = Object.freeze({
  [RECITATION_FAILURE_KIND.MICROPHONE]: 'memorisation.aiCheck.micRequired',
  [RECITATION_FAILURE_KIND.RECORDING]: 'memorisation.aiCheck.recordingInvalid',
  [RECITATION_FAILURE_KIND.NETWORK]: 'memorisation.aiCheck.serviceNetworkError',
  [RECITATION_FAILURE_KIND.PROVIDER]: 'memorisation.aiCheck.serviceUnavailable',
  [RECITATION_FAILURE_KIND.TIMEOUT]: 'memorisation.aiCheck.processingTimeout',
  [RECITATION_FAILURE_KIND.PERMANENT]: 'memorisation.aiCheck.recitationCheckFailed',
  [RECITATION_FAILURE_KIND.UNKNOWN]: 'memorisation.aiCheck.recitationCheckFailed',
})

const USER_MESSAGE_FALLBACKS = Object.freeze({
  [RECITATION_FAILURE_KIND.MICROPHONE]:
    'We couldn\'t access your microphone. Check your browser permissions and try again.',
  [RECITATION_FAILURE_KIND.RECORDING]:
    'No usable audio was captured. Try recording again.',
  [RECITATION_FAILURE_KIND.NETWORK]:
    'We couldn\'t connect to the recitation service. Your session is safe. Try again.',
  [RECITATION_FAILURE_KIND.PROVIDER]:
    'Recitation checking is temporarily unavailable. You can continue practising and try the AI check again later.',
  [RECITATION_FAILURE_KIND.TIMEOUT]:
    'This is taking longer than expected. Try again.',
  [RECITATION_FAILURE_KIND.PERMANENT]:
    'The recitation check could not be completed.',
  [RECITATION_FAILURE_KIND.UNKNOWN]:
    'The recitation check could not be completed.',
})

let attemptCounter = 0

/**
 * @returns {string}
 */
export function createRecitationAttemptId() {
  attemptCounter += 1
  const stamp = typeof Date !== 'undefined' ? Date.now() : 0
  return `recitation-${stamp}-${attemptCounter}`
}

/**
 * @param {string|null|undefined} activeId
 * @param {string|null|undefined} responseId
 * @returns {boolean}
 */
export function isStaleRecitationAttempt(activeId, responseId) {
  const active = String(activeId || '').trim()
  const response = String(responseId || '').trim()
  if (!active || !response) return false
  return active !== response
}

/**
 * @returns {{ supported: boolean, reason?: string }}
 */
export function validateRecordingEnvironment() {
  if (typeof navigator === 'undefined') {
    return { supported: false, reason: 'unsupported_browser' }
  }
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, reason: 'no_media_recorder' }
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { supported: false, reason: 'no_get_user_media' }
  }
  return { supported: true }
}

/**
 * Best-effort microphone permission probe (does not open the mic).
 *
 * @returns {Promise<{ granted: boolean, denied: boolean, prompt: boolean, reason?: string }>}
 */
export async function probeMicrophonePermission() {
  const env = validateRecordingEnvironment()
  if (!env.supported) {
    return { granted: false, denied: false, prompt: false, reason: env.reason || 'unsupported' }
  }

  const permissions = navigator.permissions
  if (permissions?.query) {
    try {
      const status = await permissions.query({ name: 'microphone' })
      if (status?.state === 'granted') return { granted: true, denied: false, prompt: false }
      if (status?.state === 'denied') return { granted: false, denied: true, prompt: false, reason: 'permission_denied' }
      return { granted: false, denied: false, prompt: true }
    } catch {
      // Permissions API unavailable for microphone in this browser.
    }
  }

  return { granted: false, denied: false, prompt: true }
}

/**
 * @param {Blob|null|undefined} blob
 * @param {{ durationSeconds?: number|null, minRecordingSeconds?: number, mimeType?: string }} [options]
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateRecordingBlob(blob, options = {}) {
  if (!blob || !(blob instanceof Blob)) {
    return { valid: false, reason: 'missing_blob' }
  }
  if (!blob.size) {
    return { valid: false, reason: 'empty_blob' }
  }

  const mimeType = String(options.mimeType || blob.type || chooseSupportedRecorderMimeType() || 'audio/webm').trim()
  if (!mimeType.startsWith('audio/')) {
    return { valid: false, reason: 'invalid_mime' }
  }

  const minSeconds = Number(
    options.minRecordingSeconds ?? RECITATION_AUDIO_THRESHOLDS.minRecordingSeconds,
  )
  const durationSeconds = Number(options.durationSeconds)
  if (Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds < minSeconds) {
    return { valid: false, reason: 'short_recording' }
  }

  return { valid: true }
}

/**
 * Classify an error without leaking provider internals to the UI layer.
 *
 * @param {unknown} error
 * @param {{ context?: string, offline?: boolean }} [options]
 * @returns {{ kind: string, retryable: boolean, logContext: Record<string, unknown>, messageKey: string }}
 */
export function classifyRecitationFailure(error, options = {}) {
  const offline = options.offline === true
    || (typeof navigator !== 'undefined' && navigator.onLine === false)

  const name = String(error?.name || error?.cause?.name || '').trim()
  const message = String(
    error?.message
    || error?.response?.data?.message
    || error?.cause?.message
    || '',
  ).trim()
  const status = Number(error?.response?.status || error?.cause?.response?.status || 0)
  const combined = `${name} ${message}`.toLowerCase()

  if (/notallowed|permission|denied|micblocked|notfound|notreadable|notfounderror|overconstrained/i.test(combined)) {
    return buildClassification(RECITATION_FAILURE_KIND.MICROPHONE, false, error, options)
  }

  if (/no audio|noaudio|empty|short_recording|short recording|too short|invalid_mime|missing_blob|empty_blob/i.test(combined)) {
    return buildClassification(RECITATION_FAILURE_KIND.RECORDING, true, error, options)
  }

  if (/timeout|timed out|taking longer|etimedout|aborted/i.test(combined)) {
    return buildClassification(RECITATION_FAILURE_KIND.TIMEOUT, true, error, options)
  }

  if (offline || /network|fetch failed|failed to fetch|econn|enotfound|offline|internet/i.test(combined)) {
    return buildClassification(RECITATION_FAILURE_KIND.NETWORK, true, error, options)
  }

  if (
    /speechmatics|transcription|websocket|provider|live streaming|stream config|quota|timelimit|service unavailable/i.test(combined)
    || status === 502
    || status === 503
    || status === 504
    || status === 429
  ) {
    return buildClassification(RECITATION_FAILURE_KIND.PROVIDER, true, error, options)
  }

  if (PERMANENT_HTTP_STATUSES.has(status) && status !== 422) {
    return buildClassification(RECITATION_FAILURE_KIND.PERMANENT, false, error, options)
  }

  if (status === 422 && /transcription|api key|speechmatics|region is not configured/i.test(combined)) {
    return buildClassification(RECITATION_FAILURE_KIND.PROVIDER, true, error, options)
  }

  return buildClassification(RECITATION_FAILURE_KIND.UNKNOWN, true, error, options)
}

/**
 * @param {string} kind
 * @param {boolean} retryable
 * @param {unknown} error
 * @param {{ context?: string }} options
 */
function buildClassification(kind, retryable, error, options = {}) {
  return {
    kind,
    retryable,
    messageKey: USER_MESSAGE_KEYS[kind] || USER_MESSAGE_KEYS[RECITATION_FAILURE_KIND.UNKNOWN],
    logContext: buildTechnicalLogContext(error, { ...options, kind }),
  }
}

/**
 * Safe technical context for server-side / console logging — never includes secrets.
 *
 * @param {unknown} error
 * @param {{ context?: string, kind?: string }} [options]
 * @returns {Record<string, unknown>}
 */
export function buildTechnicalLogContext(error, options = {}) {
  const status = Number(error?.response?.status || error?.cause?.response?.status || 0)
  const providerType = String(error?.providerType || error?.cause?.providerType || '').trim()
  const providerReason = String(error?.providerReason || error?.cause?.providerReason || '').trim()
  return {
    context: String(options.context || 'recitation').trim(),
    kind: options.kind || '',
    name: String(error?.name || error?.cause?.name || '').trim(),
    status: status || undefined,
    providerType: providerType || undefined,
    providerReason: providerReason || undefined,
    offline: typeof navigator !== 'undefined' ? navigator.onLine === false : undefined,
  }
}

/**
 * @param {(key: string) => string} t
 * @param {{ kind?: string, messageKey?: string }} classification
 * @returns {string}
 */
export function resolveRecitationFailureMessage(t, classification = {}) {
  const kind = classification.kind || RECITATION_FAILURE_KIND.UNKNOWN
  const key = classification.messageKey || USER_MESSAGE_KEYS[kind]
  const translated = typeof t === 'function' ? String(t(key) || '').trim() : ''
  if (translated && translated !== key) return translated
  return USER_MESSAGE_FALLBACKS[kind] || USER_MESSAGE_FALLBACKS[RECITATION_FAILURE_KIND.UNKNOWN]
}

/**
 * Learner-safe transcription failure copy (no Speechmatics config details).
 *
 * @param {unknown} error
 * @returns {string}
 */
export function userFacingTranscriptionFailure(error) {
  const classification = classifyRecitationFailure(error, { context: 'transcription_token' })
  return USER_MESSAGE_FALLBACKS[classification.kind] || USER_MESSAGE_FALLBACKS[RECITATION_FAILURE_KIND.PROVIDER]
}

/**
 * Schedule a slow-processing notice; returns a disposer.
 *
 * @param {(slow: boolean) => void} onSlow
 * @param {number} [delayMs]
 * @returns {() => void}
 */
export function scheduleSlowProcessingNotice(onSlow, delayMs = RECITATION_SLOW_PROCESSING_MS) {
  if (typeof onSlow !== 'function') return () => {}
  let cleared = false
  const timerId = setTimeout(() => {
    if (!cleared) onSlow(true)
  }, Math.max(0, Number(delayMs) || RECITATION_SLOW_PROCESSING_MS))

  return () => {
    cleared = true
    clearTimeout(timerId)
    onSlow(false)
  }
}

/**
 * @param {string} stage
 * @param {(key: string, fallback?: string) => string} t
 * @returns {string}
 */
export function recitationProcessingStageLabel(stage, t) {
  const value = String(stage || RECITATION_PROCESSING_STAGE.IDLE).toLowerCase()
  const map = {
    [RECITATION_PROCESSING_STAGE.RECORDING]: ['memorisation.aiCheck.stageRecording', 'Recording…'],
    [RECITATION_PROCESSING_STAGE.PROCESSING]: ['memorisation.aiCheck.stageProcessing', 'Processing…'],
    [RECITATION_PROCESSING_STAGE.ASSESSING]: ['memorisation.aiCheck.stageAssessing', 'Assessing…'],
    [RECITATION_PROCESSING_STAGE.COMPLETE]: ['memorisation.aiCheck.stageComplete', 'Complete'],
    [RECITATION_PROCESSING_STAGE.ERROR]: ['memorisation.aiCheck.stageError', 'Could not complete'],
  }
  const entry = map[value]
  if (!entry) return ''
  const translated = typeof t === 'function' ? String(t(entry[0]) || '').trim() : ''
  return translated && translated !== entry[0] ? translated : entry[1]
}
