export const SPEECHMATICS_MAX_DELAY_SECONDS = 0.7
/** Default AMD connect — Speechmatics floor for live colouring. */
export const SPEECHMATICS_AMD_MAX_DELAY_SECONDS = 0.7
/** Slow / tajwīd-heavy sessions — keep a tiny extra hold, still under 1s. */
export const SPEECHMATICS_AMD_SLOW_MAX_DELAY_SECONDS = 0.9
/** Fast reciters — max_delay cannot go below the Speechmatics floor (0.7). */
export const SPEECHMATICS_AMD_FAST_MAX_DELAY_SECONDS = 0.7
export const SPEECHMATICS_END_OF_UTTERANCE_SECONDS = 0.45
export const SPEECHMATICS_AMD_END_OF_UTTERANCE_SECONDS = 0.7
export const SPEECHMATICS_AMD_SLOW_END_OF_UTTERANCE_SECONDS = 0.95
/**
 * Fast tier still waits through a normal breath. A 0.25s cut was finalising
 * mid-ayah and the next phrase arrived as a new utterance.
 */
export const SPEECHMATICS_AMD_FAST_END_OF_UTTERANCE_SECONDS = 0.55

function clampSpeechmaticsDelay(value, fallback, min = 0.7, max = 4) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, num))
}

export function clampSpeechmaticsMaxDelaySeconds(value, fallback = SPEECHMATICS_MAX_DELAY_SECONDS) {
  return clampSpeechmaticsDelay(value, fallback, 0.7, 4)
}

export function clampSpeechmaticsEndOfUtteranceSeconds(value, fallback = SPEECHMATICS_END_OF_UTTERANCE_SECONDS) {
  // Speechmatics allows 0–2s. Keep the floor under the fast tier (0.55).
  return clampSpeechmaticsDelay(value, fallback, 0, 2)
}

/**
 * Payload pushed to an open Speechmatics session. SetRecognitionConfig can
 * update max_delay and end_of_utterance without reconnecting mid-ayah.
 */
export function buildSpeechmaticsRecognitionUpdate({
  maxDelaySeconds = SPEECHMATICS_MAX_DELAY_SECONDS,
  endOfUtteranceSeconds = SPEECHMATICS_END_OF_UTTERANCE_SECONDS,
} = {}) {
  return {
    message: 'SetRecognitionConfig',
    transcription_config: {
      max_delay: clampSpeechmaticsMaxDelaySeconds(maxDelaySeconds, SPEECHMATICS_MAX_DELAY_SECONDS),
      max_delay_mode: 'flexible',
      conversation_config: {
        end_of_utterance_silence_trigger: clampSpeechmaticsEndOfUtteranceSeconds(
          endOfUtteranceSeconds,
          SPEECHMATICS_END_OF_UTTERANCE_SECONDS,
        ),
      },
    },
  }
}

/**
 * Pace-aware Speechmatics buffering — fast sessions get snappier partials;
 * slow / tajwīd-heavy sessions keep the high delay ceiling.
 */
export function resolveAdaptiveSpeechmaticsDelays({
  paceFactor = 1,
  tajweedHeavy = false,
  amdLive = false,
  live = false,
} = {}) {
  if (!amdLive && !live) {
    return {
      maxDelaySeconds: SPEECHMATICS_MAX_DELAY_SECONDS,
      endOfUtteranceSeconds: SPEECHMATICS_END_OF_UTTERANCE_SECONDS,
      tier: 'general',
    }
  }

  const pace = Number(paceFactor)
  const normalisedPace = Number.isFinite(pace) && pace > 0 ? pace : 1

  if (normalisedPace <= 0.82) {
    return {
      maxDelaySeconds: SPEECHMATICS_AMD_FAST_MAX_DELAY_SECONDS,
      endOfUtteranceSeconds: SPEECHMATICS_AMD_FAST_END_OF_UTTERANCE_SECONDS,
      tier: 'fast',
    }
  }
  if (normalisedPace >= 1.25 || tajweedHeavy) {
    return {
      maxDelaySeconds: SPEECHMATICS_AMD_SLOW_MAX_DELAY_SECONDS,
      endOfUtteranceSeconds: SPEECHMATICS_AMD_SLOW_END_OF_UTTERANCE_SECONDS,
      tier: 'slow',
    }
  }
  return {
    maxDelaySeconds: SPEECHMATICS_AMD_MAX_DELAY_SECONDS,
    endOfUtteranceSeconds: SPEECHMATICS_AMD_END_OF_UTTERANCE_SECONDS,
    tier: 'balanced',
  }
}
