/**
 * Mobile / tab lifecycle helpers for AI Recite + AMD microphone sessions.
 * Pure logic — Memorisation.vue applies the returned plans.
 */

import { RECITATION_PROCESSING_STAGE } from './recordingResilience.js'

export const RECITATION_LIFECYCLE_PHASE = Object.freeze({
  IDLE: 'idle',
  PREPARING: 'preparing',
  RECORDING: 'recording',
  PROCESSING: 'processing',
})

const ACTIVE_PROCESSING_STAGES = new Set([
  RECITATION_PROCESSING_STAGE.PROCESSING,
  RECITATION_PROCESSING_STAGE.ASSESSING,
])

/**
 * @param {{
 *   preparing?: boolean,
 *   recording?: boolean,
 *   processingStage?: string,
 *   submitInFlight?: boolean,
 *   checkerPreparing?: boolean,
 *   checkerRecording?: boolean,
 * }} state
 */
export function resolveRecitationLifecyclePhase(state = {}) {
  if (state.preparing || state.checkerPreparing) return RECITATION_LIFECYCLE_PHASE.PREPARING
  if (state.recording || state.checkerRecording) return RECITATION_LIFECYCLE_PHASE.RECORDING
  const stage = String(state.processingStage || RECITATION_PROCESSING_STAGE.IDLE)
  if (ACTIVE_PROCESSING_STAGES.has(stage) || state.submitInFlight) {
    return RECITATION_LIFECYCLE_PHASE.PROCESSING
  }
  return RECITATION_LIFECYCLE_PHASE.IDLE
}

/**
 * @param {{
 *   preparing?: boolean,
 *   recording?: boolean,
 *   processingStage?: string,
 *   submitInFlight?: boolean,
 *   checkerPreparing?: boolean,
 *   checkerRecording?: boolean,
 *   capturingForReplay?: boolean,
 * }} state
 */
export function shouldInterruptRecitationOnBackground(state = {}) {
  if (state.capturingForReplay) return false
  return resolveRecitationLifecyclePhase(state) !== RECITATION_LIFECYCLE_PHASE.IDLE
}

/**
 * @param {MediaStream|null|undefined} stream
 */
export function mediaStreamHasLiveAudioTracks(stream) {
  if (!stream || typeof stream.getTracks !== 'function') return false
  return stream.getTracks().some((track) => (
    track.kind === 'audio'
    && track.readyState === 'live'
  ))
}

/**
 * @param {MediaRecorder|null|undefined} recorder
 */
export function mediaRecorderIsCapturing(recorder) {
  if (!recorder) return false
  const state = String(recorder.state || '')
  return state === 'recording' || state === 'paused'
}

/**
 * @param {{
 *   recitation?: { preparing?: boolean, recording?: boolean, stream?: MediaStream|null, recorder?: MediaRecorder|null },
 *   checker?: { preparing?: boolean, recording?: boolean, stream?: MediaStream|null, recorder?: MediaRecorder|null },
 * }} facts
 */
export function reconcileRecitationAfterForeground(facts = {}) {
  const recitation = facts.recitation || {}
  const checker = facts.checker || {}
  const plan = {
    resetRecitationUi: false,
    stopOrphanRecitationStream: false,
    resetCheckerUi: false,
    stopOrphanCheckerStream: false,
    syncAmdSurface: false,
  }

  const recitationUiActive = !!(recitation.preparing || recitation.recording)
  const recitationMediaLive = mediaRecorderIsCapturing(recitation.recorder)
    || mediaStreamHasLiveAudioTracks(recitation.stream)
  if (recitationUiActive && !recitationMediaLive) {
    plan.resetRecitationUi = true
    plan.syncAmdSurface = true
  } else if (!recitationUiActive && mediaStreamHasLiveAudioTracks(recitation.stream)) {
    plan.stopOrphanRecitationStream = true
  }

  const checkerUiActive = !!(checker.preparing || checker.recording)
  const checkerMediaLive = mediaRecorderIsCapturing(checker.recorder)
    || mediaStreamHasLiveAudioTracks(checker.stream)
  if (checkerUiActive && !checkerMediaLive) {
    plan.resetCheckerUi = true
  } else if (!checkerUiActive && mediaStreamHasLiveAudioTracks(checker.stream)) {
    plan.stopOrphanCheckerStream = true
  }

  return plan
}

export default {
  RECITATION_LIFECYCLE_PHASE,
  resolveRecitationLifecyclePhase,
  shouldInterruptRecitationOnBackground,
  mediaStreamHasLiveAudioTracks,
  mediaRecorderIsCapturing,
  reconcileRecitationAfterForeground,
}
