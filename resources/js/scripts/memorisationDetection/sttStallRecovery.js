/**
 * AMD live colouring freezes when Speechmatics stays "open" but stops emitting
 * transcripts. Recording / the timer keep running independently — only STT
 * recovery can unstick paint.
 */

export const AMD_STT_STALL = Object.freeze({
  /** Recognition idle before we consider a stall (ayah pauses + EOU finals can gap partials). */
  IDLE_MS: 18000,
  /** Consecutive heartbeat ticks with speech + idle recognition before reconnect. */
  SPEECH_CONFIRM_TICKS: 2,
  /** Frame RMS treated as speech on the transcription audio bridge. */
  SPEECH_RMS: 0.012,
  /** Look-back window for recent speech energy. */
  SPEECH_WINDOW_MS: 1600,
})

/**
 * Decide whether the AMD recognition heartbeat should recover STT.
 *
 * @param {{
 *   idleRecognitionMs?: number,
 *   providerOpen?: boolean,
 *   recentSpeech?: boolean,
 *   speechConfirmTicks?: number,
 *   recovering?: boolean,
 *   browserSttActive?: boolean,
 *   recentCommittedMs?: number,
 * }} input
 * @returns {{ action: 'none' | 'wait_speech_confirm' | 'reconnect_or_failover' | 'start_browser_stt', nextSpeechConfirmTicks: number }}
 */
export function evaluateAmdSttStall(input = {}) {
  const idleRecognitionMs = Math.max(0, Number(input.idleRecognitionMs) || 0)
  const providerOpen = !!input.providerOpen
  const recentSpeech = !!input.recentSpeech
  const recovering = !!input.recovering
  const browserSttActive = !!input.browserSttActive
  const recentCommittedMs = Math.max(0, Number(input.recentCommittedMs) || 0)
  let speechConfirmTicks = Math.max(0, Number(input.speechConfirmTicks) || 0)

  if (recovering || browserSttActive) {
    return { action: 'none', nextSpeechConfirmTicks: 0 }
  }

  // Finals can arrive in bursts after end-of-utterance while partials go quiet.
  if (recentCommittedMs > 0 && recentCommittedMs < 14000) {
    return { action: 'none', nextSpeechConfirmTicks: 0 }
  }

  if (idleRecognitionMs < AMD_STT_STALL.IDLE_MS) {
    return { action: 'none', nextSpeechConfirmTicks: 0 }
  }

  // Socket gone — colouring cannot advance without a recogniser.
  if (!providerOpen) {
    return { action: 'start_browser_stt', nextSpeechConfirmTicks: 0 }
  }

  // Open but quiet: only recover when the learner is still speaking.
  // Pure pauses must not tear down a healthy Speechmatics session.
  if (!recentSpeech) {
    return { action: 'none', nextSpeechConfirmTicks: 0 }
  }

  speechConfirmTicks += 1
  if (speechConfirmTicks < AMD_STT_STALL.SPEECH_CONFIRM_TICKS) {
    return { action: 'wait_speech_confirm', nextSpeechConfirmTicks: speechConfirmTicks }
  }

  return { action: 'reconnect_or_failover', nextSpeechConfirmTicks: 0 }
}

/**
 * Recording stays live during STT reconnect. Surface that on the status pill
 * so the learner does not think the microphone died.
 */
export function shouldShowAmdSttStallNotice(input = {}) {
  if (input.recovering || input.stallNotice) return true
  if (Math.max(0, Number(input.speechConfirmTicks) || 0) > 0) return true
  const action = String(input.action || '')
  return action === 'wait_speech_confirm'
    || action === 'reconnect_or_failover'
    || action === 'start_browser_stt'
}

export function resolveAmdRecordingPillLabel(input = {}) {
  if (shouldShowAmdSttStallNotice(input)) {
    return input.reconnectingLabel || 'Catching up…'
  }
  return input.recordingLabel || 'Recording'
}

/**
 * Resolve live alignment words when speaker diarization flips unreliable mid-pass.
 * Emptying the stream freezes colouring while Recording stays live.
 *
 * @param {{
 *   selection?: { reliable?: boolean, words?: unknown[] },
 *   rawWords?: unknown[],
 *   previousWords?: unknown[],
 * }} input
 * @returns {unknown[]}
 */
export function resolveLiveAlignmentWords(input = {}) {
  const selection = input.selection || {}
  const rawWords = Array.isArray(input.rawWords) ? input.rawWords : []
  const previousWords = Array.isArray(input.previousWords) ? input.previousWords : []
  if (selection.reliable !== false) {
    return Array.isArray(selection.words) ? selection.words : rawWords
  }
  if (previousWords.length) return previousWords
  return rawWords
}
