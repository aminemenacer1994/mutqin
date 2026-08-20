export const SPEECHMATICS_MAX_DELAY_SECONDS = 0.7
/** Default AMD connect — Speechmatics floor for live colouring. */
export const SPEECHMATICS_AMD_MAX_DELAY_SECONDS = 0.7
/** Slow / tajwīd-heavy sessions — keep a tiny extra hold, still under 1s. */
export const SPEECHMATICS_AMD_SLOW_MAX_DELAY_SECONDS = 0.9
/** Fast reciters — Speechmatics minimum. */
export const SPEECHMATICS_AMD_FAST_MAX_DELAY_SECONDS = 0.7
export const SPEECHMATICS_END_OF_UTTERANCE_SECONDS = 0.45
export const SPEECHMATICS_AMD_END_OF_UTTERANCE_SECONDS = 0.5
export const SPEECHMATICS_AMD_SLOW_END_OF_UTTERANCE_SECONDS = 0.7
export const SPEECHMATICS_AMD_FAST_END_OF_UTTERANCE_SECONDS = 0.4

function clampSpeechmaticsDelay(value, fallback, min = 0.7, max = 4) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, num))
}

export function clampSpeechmaticsMaxDelaySeconds(value, fallback = SPEECHMATICS_MAX_DELAY_SECONDS) {
  return clampSpeechmaticsDelay(value, fallback, 0.7, 4)
}

export function clampSpeechmaticsEndOfUtteranceSeconds(value, fallback = SPEECHMATICS_END_OF_UTTERANCE_SECONDS) {
  return clampSpeechmaticsDelay(value, fallback, 0.4, 4)
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
