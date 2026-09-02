/**
 * Canonical AI recitation result state + audio sufficiency thresholds.
 *
 * Silence, empty transcripts, short recordings, mic failures and unusable
 * recognition must resolve to `insufficient_audio` — never `needs_practice`.
 */

import { RECITATION_THRESHOLDS } from '../engine/recitationThresholds.js'

export const RECITATION_RESULT_STATE = Object.freeze({
  INSUFFICIENT_AUDIO: 'insufficient_audio',
  NEEDS_PRACTICE: 'needs_practice',
  DEVELOPING: 'developing',
  STRONG: 'strong',
})

/**
 * Single configuration for audio / recognition sufficiency checks.
 * Keep assessment banding thresholds here so UI + scoring stay aligned.
 */
export const RECITATION_AUDIO_THRESHOLDS = Object.freeze({
  /** Minimum MediaRecorder / attempt length before assessment is fair. */
  minRecordingSeconds: RECITATION_THRESHOLDS.minRecordingSeconds,
  /** Minimum detected usable speech duration. */
  minUsableSpeechSeconds: RECITATION_THRESHOLDS.minUsableSpeechSeconds,
  /**
   * Mean recognition-word confidence below this is too low to assess fairly
   * (when speech was present). Overall evaluation confidence alone is not used
   * for empty recognition — that path is caught by spoken-evidence checks.
   */
  minRecognitionConfidence: RECITATION_THRESHOLDS.minRecognitionConfidence,
  /** Accuracy banding for scored attempts (labels: strong / developing / needs_practice). */
  strongAccuracyMin: RECITATION_THRESHOLDS.strongAccuracyMin,
  developingAccuracyMin: RECITATION_THRESHOLDS.developingAccuracyMin,
  /**
   * Advancement with residual hard errors (1 red/black word) requires this floor.
   * Clean strong (0 hard errors) may still advance from strongAccuracyMin.
   */
  progressionWithErrorsMin: RECITATION_THRESHOLDS.progressionWithErrorsMin,
  /** Do not band as strong when evaluation confidence is below this. */
  minEvaluationConfidenceForStrong: RECITATION_THRESHOLDS.minEvaluationConfidenceForStrong,
})

export const INSUFFICIENT_AUDIO_REASONS = Object.freeze({
  NO_SPEECH: 'no_speech',
  EMPTY_TRANSCRIPT: 'empty_transcript',
  SHORT_RECORDING: 'short_recording',
  SHORT_SPEECH: 'short_speech',
  MIC_PERMISSION: 'mic_permission',
  PROCESSING_FAILED: 'processing_failed',
  LOW_CONFIDENCE: 'low_confidence',
  UNUSABLE_AUDIO: 'unusable_audio',
  EXPLICIT: 'explicit',
})

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function finiteNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isCorrectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (!s || s.includes('incorrect') || s.includes('incomplete')) return false
  return s === 'correct' || s.includes('word-correct') || s === 'green'
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isPartialStatus(status) {
  const s = String(status || '').toLowerCase()
  return s.includes('partial') || s.includes('close') || s === 'amber' || s === 'yellow'
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isMissedStatus(status) {
  const s = String(status || '').toLowerCase()
  return s.includes('incorrect') || s.includes('missing') || s.includes('missed') || s === 'red'
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isOmittedStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'omitted' || s === 'black' || s.includes('omission')
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isGrayStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'pending' || s === 'skipped' || s === 'notattempted' || s === 'gray' || s === 'grey'
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isSpokenAttemptStatus(status) {
  const s = String(status || '').toLowerCase()
  if (!s) return false
  if (isGrayStatus(s) || isOmittedStatus(s)) return false
  return isCorrectStatus(s) || isPartialStatus(s) || isMissedStatus(s)
}

/**
 * Normalise accuracy to 0–100 integer, or null when unavailable.
 *
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @returns {number|null}
 */
export function resolveAccuracyPercent(result = null, extras = {}) {
  const accuracyRaw = finiteNumber(
    extras.accuracy_percent
    ?? result?.accuracyScore
    ?? result?.accuracy
    ?? result?.matchPercent
    ?? result?.score
    ?? result?.percent
    ?? result?.overallAccuracy,
  )
  if (accuracyRaw == null) return null
  return Math.max(0, Math.min(100, Math.round(accuracyRaw <= 1 ? accuracyRaw * 100 : accuracyRaw)))
}

/**
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @returns {string[]}
 */
function collectCommittedWords(result = null, extras = {}) {
  return []
    .concat(Array.isArray(result?.committedWords) ? result.committedWords : [])
    .concat(Array.isArray(result?.recognizedWords) ? result.recognizedWords : [])
    .concat(Array.isArray(result?.stabilizedWords) ? result.stabilizedWords : [])
    .concat(Array.isArray(extras.committedWords) ? extras.committedWords : [])
    .concat(Array.isArray(extras.recognizedWords) ? extras.recognizedWords : [])
}

/**
 * @param {unknown[]} words
 * @returns {number|null}
 */
function meanWordConfidence(words = []) {
  const values = (Array.isArray(words) ? words : [])
    .map((word) => finiteNumber(word?.confidence))
    .filter((value) => value != null)
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Usable speech duration from word timings or explicit fields.
 *
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @param {unknown[]} committed
 * @returns {number|null}
 */
function resolveUsableSpeechSeconds(result = null, extras = {}, committed = []) {
  const explicit = finiteNumber(
    extras.usable_speech_seconds
    ?? extras.usableSpeechSeconds
    ?? result?.usableSpeechSeconds
    ?? result?.speechDurationSeconds
    ?? result?.speechSeconds,
  )
  if (explicit != null) return Math.max(0, explicit)

  const starts = []
  const ends = []
  for (const word of committed) {
    const start = finiteNumber(word?.start)
    const end = finiteNumber(word?.end)
    if (start != null) starts.push(start)
    if (end != null) ends.push(end)
  }
  if (starts.length && ends.length) {
    return Math.max(0, Math.max(...ends) - Math.min(...starts))
  }
  return null
}

/**
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @returns {number|null}
 */
function resolveRecordingSeconds(result = null, extras = {}) {
  return finiteNumber(
    extras.duration_seconds
    ?? extras.recordingSeconds
    ?? result?.durationSeconds
    ?? result?.recordingSeconds
    ?? result?.elapsedSeconds,
  )
}

/**
 * Detect whether this attempt had any usable spoken evidence.
 *
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @returns {boolean}
 */
export function hasSpokenRecitationEvidence(result = null, extras = {}) {
  const committed = collectCommittedWords(result, extras)
  const transcript = String(result?.transcript || extras.transcript || '').trim()
  const wordStatuses = []
    .concat(Array.isArray(result?.wordStatuses) ? result.wordStatuses : [])
    .concat(Array.isArray(extras.wordStatuses) ? extras.wordStatuses : [])
  const spokenFromStatuses = wordStatuses.some((word) => isSpokenAttemptStatus(word?.status))
  return committed.length > 0 || transcript.length > 0 || spokenFromStatuses
}

/**
 * @param {string} reason
 * @returns {boolean}
 */
function reasonLooksInsufficient(reason = '') {
  return /no[_\s-]?speech|silence|no[_\s-]?audio|empty[_\s-]?transcript|unusable|insufficient|processing[_\s-]?(?:fail|error)|audio[_\s-]?process|mic(?:rophone)?\s*(?:fail|error|denied|permission|block)|permission[_\s-]?(?:denied|fail)|notallowed|short[_\s-]?(?:recording|audio|speech)|too[_\s-]?short|low[_\s-]?confidence/i
    .test(String(reason || ''))
}

/**
 * Explain why an attempt is insufficient, or null when it is assessable.
 *
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @param {{ thresholds?: typeof RECITATION_AUDIO_THRESHOLDS }=} options
 * @returns {string|null}
 */
export function resolveInsufficientAudioReason(result = null, extras = {}, options = {}) {
  const thresholds = { ...RECITATION_AUDIO_THRESHOLDS, ...(options.thresholds || {}) }

  const explicitState = String(
    extras.result_state
    || extras.resultState
    || extras.assessment_quality
    || extras.assessmentQuality
    || result?.resultState
    || result?.result_state
    || result?.assessmentQuality
    || result?.assessment_quality
    || '',
  ).toLowerCase().trim()
  if (explicitState === RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO) {
    return INSUFFICIENT_AUDIO_REASONS.EXPLICIT
  }

  const flags = [
    extras.insufficient_audio,
    extras.insufficientAudio,
    result?.insufficient_audio,
    result?.insufficientAudio,
    result?.noSpeech,
    result?.silence,
    result?.unusableAudio,
    result?.unusable_audio,
    result?.audioUnusable,
    extras.no_speech,
    extras.noSpeech,
    extras.mic_permission_failed,
    extras.micPermissionFailed,
    result?.micPermissionFailed,
    result?.micDenied,
    extras.processing_failed,
    extras.processingFailed,
    result?.processingFailed,
  ]
  if (flags.some(Boolean)) {
    if (extras.mic_permission_failed || extras.micPermissionFailed || result?.micPermissionFailed || result?.micDenied) {
      return INSUFFICIENT_AUDIO_REASONS.MIC_PERMISSION
    }
    if (extras.processing_failed || extras.processingFailed || result?.processingFailed) {
      return INSUFFICIENT_AUDIO_REASONS.PROCESSING_FAILED
    }
    if (result?.noSpeech || result?.silence || extras.no_speech || extras.noSpeech) {
      return INSUFFICIENT_AUDIO_REASONS.NO_SPEECH
    }
    return INSUFFICIENT_AUDIO_REASONS.UNUSABLE_AUDIO
  }

  const reason = String(
    result?.failureReason
    || result?.errorCode
    || result?.error
    || extras.failure_reason
    || extras.failureReason
    || extras.errorCode
    || '',
  ).toLowerCase()
  if (reasonLooksInsufficient(reason)) {
    if (/mic|permission|notallowed|denied|block/.test(reason)) return INSUFFICIENT_AUDIO_REASONS.MIC_PERMISSION
    if (/process/.test(reason)) return INSUFFICIENT_AUDIO_REASONS.PROCESSING_FAILED
    if (/short|too[_\s-]?short/.test(reason)) return INSUFFICIENT_AUDIO_REASONS.SHORT_RECORDING
    if (/confidence/.test(reason)) return INSUFFICIENT_AUDIO_REASONS.LOW_CONFIDENCE
    if (/empty|transcript/.test(reason)) return INSUFFICIENT_AUDIO_REASONS.EMPTY_TRANSCRIPT
    if (/no[_\s-]?speech|silence/.test(reason)) return INSUFFICIENT_AUDIO_REASONS.NO_SPEECH
    return INSUFFICIENT_AUDIO_REASONS.UNUSABLE_AUDIO
  }

  const recordingSeconds = resolveRecordingSeconds(result, extras)
  // Only treat a measured positive duration as "too short". Missing/0 duration is
  // common for AMD live completions and must not discard a real spoken attempt.
  if (
    recordingSeconds != null
    && recordingSeconds > 0
    && recordingSeconds < thresholds.minRecordingSeconds
  ) {
    return INSUFFICIENT_AUDIO_REASONS.SHORT_RECORDING
  }

  const committed = collectCommittedWords(result, extras)
  const transcript = String(result?.transcript || extras.transcript || '').trim()
  const hasSpoken = hasSpokenRecitationEvidence(result, extras)

  if (!hasSpoken) {
    if (recordingSeconds != null && recordingSeconds > 0) return INSUFFICIENT_AUDIO_REASONS.NO_SPEECH
    if (!transcript && !committed.length) return INSUFFICIENT_AUDIO_REASONS.EMPTY_TRANSCRIPT
    return INSUFFICIENT_AUDIO_REASONS.NO_SPEECH
  }

  const speechSeconds = resolveUsableSpeechSeconds(result, extras, committed)
  if (speechSeconds != null && speechSeconds < thresholds.minUsableSpeechSeconds) {
    return INSUFFICIENT_AUDIO_REASONS.SHORT_SPEECH
  }

  // Low ASR confidence alone must not discard a real spoken attempt that already
  // produced word-level feedback (red/amber/green). That path was blaming the mic
  // after the learner had clearly recited.
  const wordStatuses = Array.isArray(result?.wordStatuses)
    ? result.wordStatuses
    : (Array.isArray(extras.wordStatuses) ? extras.wordStatuses : [])
  const spokenFromStatuses = wordStatuses.some((word) => isSpokenAttemptStatus(word?.status))
  const meanConfidence = meanWordConfidence(committed)
  if (
    meanConfidence != null
    && committed.length > 0
    && meanConfidence < thresholds.minRecognitionConfidence
    && !spokenFromStatuses
  ) {
    return INSUFFICIENT_AUDIO_REASONS.LOW_CONFIDENCE
  }

  return null
}

/**
 * Resolve the learner-facing result state for an AI recitation attempt.
 *
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @param {{ thresholds?: typeof RECITATION_AUDIO_THRESHOLDS }=} options
 * @returns {'insufficient_audio'|'needs_practice'|'developing'|'strong'}
 */
export function resolveRecitationResultState(result = null, extras = {}, options = {}) {
  const thresholds = { ...RECITATION_AUDIO_THRESHOLDS, ...(options.thresholds || {}) }
  const insufficientReason = resolveInsufficientAudioReason(result, extras, { thresholds })
  if (insufficientReason) return RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO

  const explicit = String(
    extras.result_state
    || extras.resultState
    || result?.resultState
    || result?.result_state
    || '',
  ).toLowerCase().trim()
  if (Object.values(RECITATION_RESULT_STATE).includes(explicit)) return explicit

  // Legacy outcome aliases from API / older callers.
  const legacy = String(
    extras.outcome
    || result?.outcome
    || extras.ai_result
    || '',
  ).toLowerCase().trim()
  if (legacy === 'strong' || legacy === 'confident' || legacy === 'good') {
    return RECITATION_RESULT_STATE.STRONG
  }
  if (legacy === 'developing' || legacy === 'mixed' || legacy === 'okay') {
    return RECITATION_RESULT_STATE.DEVELOPING
  }
  if (legacy === 'needs_practice' || legacy === 'needs practice' || legacy === 'weak') {
    return RECITATION_RESULT_STATE.NEEDS_PRACTICE
  }

  const accuracy = resolveAccuracyPercent(result, extras)
  if (accuracy != null) {
    if (accuracy >= thresholds.strongAccuracyMin) {
      // High accuracy with weak provider confidence must not become a fabricated strong.
      const evaluationConfidence = finiteNumber(
        extras.confidence
        ?? extras.evaluationConfidence
        ?? result?.confidence
        ?? result?.evaluationConfidence
        ?? result?.recognitionConfidence,
      )
      const strongConfidenceFloor = Number.isFinite(Number(thresholds.minEvaluationConfidenceForStrong))
        ? Number(thresholds.minEvaluationConfidenceForStrong)
        : RECITATION_THRESHOLDS.minEvaluationConfidenceForStrong
      if (
        evaluationConfidence != null
        && evaluationConfidence < strongConfidenceFloor
      ) {
        return RECITATION_RESULT_STATE.DEVELOPING
      }
      return RECITATION_RESULT_STATE.STRONG
    }
    if (accuracy >= thresholds.developingAccuracyMin) return RECITATION_RESULT_STATE.DEVELOPING
    return RECITATION_RESULT_STATE.NEEDS_PRACTICE
  }

  if (result?.passed === true || result?.strong === true) return RECITATION_RESULT_STATE.STRONG
  if (result?.passed === false || result?.weak === true) return RECITATION_RESULT_STATE.NEEDS_PRACTICE

  return RECITATION_RESULT_STATE.DEVELOPING
}

/**
 * Map canonical result state ↔ legacy strong/mixed/weak API values.
 * `insufficient_audio` has no API equivalent — callers must skip persist.
 *
 * @param {string} state
 * @returns {'strong'|'mixed'|'weak'|null}
 */
export function resultStateToLegacyOutcome(state) {
  const value = String(state || '').toLowerCase().trim()
  if (value === RECITATION_RESULT_STATE.STRONG || value === 'strong') return 'strong'
  if (value === RECITATION_RESULT_STATE.DEVELOPING || value === 'mixed' || value === 'developing') {
    return 'mixed'
  }
  if (value === RECITATION_RESULT_STATE.NEEDS_PRACTICE || value === 'weak' || value === 'needs_practice') {
    return 'weak'
  }
  return null
}

/**
 * @param {string} outcome strong|mixed|weak|insufficient_audio|needs_practice|developing
 * @returns {string}
 */
export function legacyOutcomeToResultState(outcome) {
  const value = String(outcome || '').toLowerCase().trim()
  if (value === RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO) {
    return RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO
  }
  if (value === 'strong' || value === 'confident' || value === 'good') {
    return RECITATION_RESULT_STATE.STRONG
  }
  if (value === 'mixed' || value === 'developing' || value === 'okay') {
    return RECITATION_RESULT_STATE.DEVELOPING
  }
  if (value === 'weak' || value === 'needs_practice' || value === 'needs practice') {
    return RECITATION_RESULT_STATE.NEEDS_PRACTICE
  }
  return RECITATION_RESULT_STATE.DEVELOPING
}

/**
 * Build a minimal synthetic result for silence / mic / processing failures.
 *
 * @param {{
 *   reason?: string,
 *   durationSeconds?: number,
 *   failureReason?: string,
 *   micPermissionFailed?: boolean,
 *   processingFailed?: boolean,
 *   noSpeech?: boolean,
 * }} input
 * @returns {Record<string, unknown>}
 */
export function buildInsufficientAudioResult(input = {}) {
  const reason = input.reason || INSUFFICIENT_AUDIO_REASONS.NO_SPEECH
  return {
    resultState: RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO,
    assessmentQuality: RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO,
    insufficient_audio: true,
    insufficientAudio: true,
    noSpeech: input.noSpeech !== false && reason === INSUFFICIENT_AUDIO_REASONS.NO_SPEECH,
    micPermissionFailed: !!input.micPermissionFailed || reason === INSUFFICIENT_AUDIO_REASONS.MIC_PERMISSION,
    processingFailed: !!input.processingFailed || reason === INSUFFICIENT_AUDIO_REASONS.PROCESSING_FAILED,
    failureReason: input.failureReason || reason,
    transcript: '',
    committedWords: [],
    recognizedWords: [],
    wordStatuses: [],
    colorCounts: { green: 0, amber: 0, red: 0, black: 0, gray: 0 },
    accuracyScore: null,
    durationSeconds: Number(input.durationSeconds || 0),
    weakAyahs: [],
    reviewMetadata: null,
    recommendation: null,
  }
}
