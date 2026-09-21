/**
 * Live and final audio gate. Numbers must match
 * App\Services\Memorisation\SpeechmaticsAudioPolicy (save-time authority).
 * Do not duplicate these thresholds as bare literals in callers.
 */
export const SPEECHMATICS_AUDIO_GATE = Object.freeze({
  minSnrDb: 4,
  minRms: 0.008,
  minPeak: 0.025,
  maxClippingRatio: 0.08,
  minSpeechRatio: 0.08,
})

function finiteOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/**
 * @param {Record<string, unknown>|null|undefined} metrics
 * @param {string} [explicitStatus]
 * @returns {{ reliable: boolean, reason: string|null, status: string }}
 */
export function evaluateSpeechmaticsAudioGate(metrics = null, explicitStatus = '') {
  const explicit = String(explicitStatus || '').trim().toLowerCase()
  if (/heavy_noise|low_volume|clipping|broken|incomplete|unreliable|multiple_competing|music|tv/.test(explicit)) {
    return { reliable: false, reason: explicit, status: explicit }
  }

  if (!metrics || typeof metrics !== 'object') {
    return { reliable: true, reason: null, status: 'clear' }
  }

  const rms = finiteOrNull(metrics.rms)
  const peak = finiteOrNull(metrics.peak)
  const clipping = finiteOrNull(metrics.clipping_ratio)
  const speech = finiteOrNull(metrics.speech_ratio)
  const snr = finiteOrNull(metrics.snr_db)

  if (metrics.broken === true || metrics.complete === false) {
    return { reliable: false, reason: 'broken_recording', status: 'broken_recording' }
  }
  if (clipping !== null && clipping >= SPEECHMATICS_AUDIO_GATE.maxClippingRatio) {
    return { reliable: false, reason: 'severe_clipping', status: 'severe_clipping' }
  }
  if ((rms !== null && rms < SPEECHMATICS_AUDIO_GATE.minRms) || (peak !== null && peak < SPEECHMATICS_AUDIO_GATE.minPeak)) {
    return { reliable: false, reason: 'very_low_volume', status: 'very_low_volume' }
  }
  if (speech !== null && speech < SPEECHMATICS_AUDIO_GATE.minSpeechRatio) {
    return { reliable: false, reason: 'insufficient_usable_speech', status: 'insufficient_usable_speech' }
  }
  if (snr !== null && snr < SPEECHMATICS_AUDIO_GATE.minSnrDb) {
    return { reliable: false, reason: 'heavy_noise', status: 'heavy_noise' }
  }

  return { reliable: true, reason: null, status: 'clear' }
}

const SOFT_AUDIO_GATE_REASONS = new Set([
  'heavy_noise',
  'very_low_volume',
  'insufficient_usable_speech',
])

/**
 * Soft acoustic flags (noise suppression, quiet mics, tajwīd pauses) must not
 * discard a transcript Speechmatics or the browser already recognised.
 * Broken or clipped audio still blocks assessment.
 */
export function audioGateBlocksTranscript(gate, wordCount = 0) {
  if (!gate || gate.reliable) return false
  if (SOFT_AUDIO_GATE_REASONS.has(String(gate.reason || gate.status || '')) && Number(wordCount) >= 2) {
    return false
  }
  return true
}
