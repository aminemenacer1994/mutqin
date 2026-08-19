export const SPEECHMATICS_MAX_DELAY_SECONDS = 1.4
/** Default AMD connect — balanced latency vs pause tolerance. */
export const SPEECHMATICS_AMD_MAX_DELAY_SECONDS = 2.0
/** Slow / tajwīd-heavy sessions — maximum Speechmatics patience. */
export const SPEECHMATICS_AMD_SLOW_MAX_DELAY_SECONDS = 2.8
/** Fast reciters — lower partial lag. */
export const SPEECHMATICS_AMD_FAST_MAX_DELAY_SECONDS = 1.2
export const SPEECHMATICS_END_OF_UTTERANCE_SECONDS = 1.4
export const SPEECHMATICS_AMD_END_OF_UTTERANCE_SECONDS = 1.8
export const SPEECHMATICS_AMD_SLOW_END_OF_UTTERANCE_SECONDS = 2.2
export const SPEECHMATICS_AMD_FAST_END_OF_UTTERANCE_SECONDS = 1.2

function clampSpeechmaticsDelay(value, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0.7, Math.min(4, num))
}

export function clampSpeechmaticsMaxDelaySeconds(value, fallback = SPEECHMATICS_MAX_DELAY_SECONDS) {
  return clampSpeechmaticsDelay(value, fallback)
}

export function clampSpeechmaticsEndOfUtteranceSeconds(value, fallback = SPEECHMATICS_END_OF_UTTERANCE_SECONDS) {
  return clampSpeechmaticsDelay(value, fallback)
}

/**
 * Pace-aware Speechmatics buffering — fast sessions get snappier partials;
 * slow / tajwīd-heavy sessions keep the high delay ceiling.
 */
export function resolveAdaptiveSpeechmaticsDelays({
  paceFactor = 1,
  tajweedHeavy = false,
  amdLive = false,
} = {}) {
  if (!amdLive) {
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
