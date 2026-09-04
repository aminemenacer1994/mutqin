/**
 * Confirmed-mistake audio/visual feedback for live AI memorisation checks.
 * Uses Web Audio only (no external audio dependency).
 */

export const AMD_MISTAKE_SOUND_PREF_KEY = 'mutqin.amd.mistakeSound'

/** Future-facing handling modes for confirmed mistakes. */
export const MISTAKE_HANDLING_MODES = Object.freeze({
  CONTINUE_AND_REVIEW: 'continue_and_review',
  STOP_ON_MISTAKE: 'stop_on_mistake',
})

/** Statuses that count as a confirmed recitation mistake cue. */
export const CONFIRMED_MISTAKE_STATUSES = Object.freeze([
  'incorrect',
  'omitted',
  'skipped', // out-of-expected-order / skipped ahead
])

/** Close-match / uncertain — must not trigger a cue. */
export const UNCERTAIN_STATUSES = Object.freeze([
  'partial',
  'pending',
  'notattempted',
  'not_attempted',
])

export const MISTAKE_CUE_MIN_CONFIDENCE = 0.28
export const STOP_ON_MISTAKE_CUE_MIN_CONFIDENCE = 0.12
export const MISTAKE_CUE_DEBOUNCE_MS = 180
export const MISTAKE_CUE_PEAK_GAIN = 0.14
export const MISTAKE_VISUAL_MS = 900

export function normaliseMistakeSoundEnabled(value, fallback = true) {
  if (value === true || value === 1 || value === '1' || value === 'on' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'off' || value === 'false') return false
  return fallback
}

export function readStoredMistakeSoundEnabled(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return true
  try {
    const raw = storage.getItem(AMD_MISTAKE_SOUND_PREF_KEY)
    if (raw == null) return true
    return normaliseMistakeSoundEnabled(raw, true)
  } catch {
    return true
  }
}

export function storeMistakeSoundEnabled(enabled, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return
  try {
    storage.setItem(AMD_MISTAKE_SOUND_PREF_KEY, enabled ? '1' : '0')
  } catch { /* ignore */ }
}

export function isConfirmedMistakeStatus(status = '') {
  return CONFIRMED_MISTAKE_STATUSES.includes(String(status || '').toLowerCase())
}

export function isUncertainWordStatus(status = '') {
  return UNCERTAIN_STATUSES.includes(String(status || '').toLowerCase())
}

/**
 * Pure gate for whether a live word transition should fire a mistake cue.
 * @returns {{ play: boolean, reason: string }}
 */
export function shouldPlayMistakeCue({
  previousStatus = 'pending',
  nextStatus = 'pending',
  confidence = null,
  micActive = false,
  reviewing = false,
  muted = false,
  alreadySignalled = false,
  interim = false,
  minConfidence = MISTAKE_CUE_MIN_CONFIDENCE,
} = {}) {
  if (muted) return { play: false, reason: 'muted' }
  if (reviewing) return { play: false, reason: 'reviewing' }
  if (!micActive) return { play: false, reason: 'mic_inactive' }
  if (interim) return { play: false, reason: 'interim' }
  if (alreadySignalled) return { play: false, reason: 'duplicate_word' }
  if (!isConfirmedMistakeStatus(nextStatus)) return { play: false, reason: 'not_confirmed_mistake' }
  if (isConfirmedMistakeStatus(previousStatus)) return { play: false, reason: 'already_confirmed' }
  // Still deciding between close-match and incorrect.
  if (String(previousStatus || '').toLowerCase() === 'partial' && String(nextStatus || '').toLowerCase() === 'incorrect') {
    // Allow amber→red only once it has worsened to a confirmed incorrect.
    // (partial itself never cues; the upgrade to incorrect may cue.)
  }
  if (isUncertainWordStatus(nextStatus)) return { play: false, reason: 'uncertain' }
  const floor = Number.isFinite(Number(minConfidence)) ? Number(minConfidence) : MISTAKE_CUE_MIN_CONFIDENCE
  if (confidence != null && Number.isFinite(Number(confidence)) && Number(confidence) < floor) {
    return { play: false, reason: 'low_confidence' }
  }
  return { play: true, reason: 'confirmed_mistake' }
}

function createSoftMistakeBuffer(audioContext) {
  const sampleRate = audioContext.sampleRate || 44100
  const duration = 0.22
  const length = Math.max(1, Math.floor(sampleRate * duration))
  const buffer = audioContext.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  // Clear two-tone cue: short mid blip + soft lower confirm (still non-harsh).
  const freqA = 520
  const freqB = 390
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate
    const env = Math.sin(Math.PI * (i / (length - 1 || 1))) ** 1.1
    const mix = t < 0.1
      ? Math.sin(2 * Math.PI * freqA * t)
      : Math.sin(2 * Math.PI * freqB * t) * 0.92
    data[i] = mix * env * 0.95
  }
  return buffer
}

/**
 * Session-scoped controller: preference, dedupe, debounce, preload, playback.
 */
export function createMistakeFeedbackController(options = {}) {
  const nowFn = typeof options.now === 'function' ? options.now : () => Date.now()
  let enabled = options.enabled != null
    ? normaliseMistakeSoundEnabled(options.enabled, true)
    : readStoredMistakeSoundEnabled(options.storage)
  let mode = options.mode || MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW
  let audioContext = options.audioContext || null
  let buffer = null
  let unlocked = false
  let playing = false
  let lastPlayedAt = 0
  const signalledIndexes = new Set()
  let ownsContext = false

  function ensureContext() {
    if (audioContext) return audioContext
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    try {
      audioContext = new Ctor()
      ownsContext = true
      return audioContext
    } catch {
      return null
    }
  }

  function preload() {
    const ctx = ensureContext()
    if (!ctx) return false
    if (!buffer) {
      try {
        buffer = createSoftMistakeBuffer(ctx)
      } catch {
        return false
      }
    }
    return true
  }

  async function prepareAfterUserGesture() {
    const ctx = ensureContext()
    if (!ctx) return false
    preload()
    try {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        await ctx.resume()
      }
      unlocked = true
      return true
    } catch {
      return false
    }
  }

  function setEnabled(next, { persist = true } = {}) {
    enabled = normaliseMistakeSoundEnabled(next, enabled)
    if (persist) storeMistakeSoundEnabled(enabled, options.storage)
    return enabled
  }

  function resetSessionSignals() {
    signalledIndexes.clear()
    lastPlayedAt = 0
    playing = false
  }

  function markSignalled(wordIndex) {
    if (Number.isFinite(Number(wordIndex))) signalledIndexes.add(Number(wordIndex))
  }

  function hasSignalled(wordIndex) {
    return Number.isFinite(Number(wordIndex)) && signalledIndexes.has(Number(wordIndex))
  }

  function playTone() {
    if (!enabled) return false
    if (!preload()) return false
    const ctx = audioContext || ensureContext()
    if (!ctx || !buffer) return false
    // Best-effort unlock if Start already opened the context but the flag lagged.
    if (!unlocked && ctx.state === 'running') unlocked = true
    if (!unlocked) {
      try {
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
          void ctx.resume().then(() => { unlocked = true }).catch(() => {})
        }
      } catch { /* ignore */ }
      return false
    }
    const elapsed = nowFn() - lastPlayedAt
    // Debounce is the primary anti-overlap guard (covers rapid live feedback).
    if (elapsed < MISTAKE_CUE_DEBOUNCE_MS) return false
    try {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        void ctx.resume()
      }
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      source.buffer = buffer
      gain.gain.value = MISTAKE_CUE_PEAK_GAIN
      source.connect(gain)
      gain.connect(ctx.destination)
      playing = true
      lastPlayedAt = nowFn()
      source.onended = () => {
        playing = false
      }
      source.start(0)
      const clearAfter = Math.ceil((buffer.duration || 0.14) * 1000) + 30
      setTimeout(() => { playing = false }, clearAfter)
      return true
    } catch {
      playing = false
      return false
    }
  }

  /**
   * Evaluate a live word transition and optionally play + signal visual.
   * @returns {{ played: boolean, visual: boolean, shouldStop: boolean, reason: string }}
   */
  function notifyWordTransition({
    wordIndex,
    previousStatus,
    nextStatus,
    confidence,
    micActive,
    reviewing,
    interim = false,
  } = {}) {
    const gate = shouldPlayMistakeCue({
      previousStatus,
      nextStatus,
      confidence,
      micActive,
      reviewing,
      muted: !enabled,
      alreadySignalled: hasSignalled(wordIndex),
      interim,
      minConfidence: mode === MISTAKE_HANDLING_MODES.STOP_ON_MISTAKE
        ? STOP_ON_MISTAKE_CUE_MIN_CONFIDENCE
        : MISTAKE_CUE_MIN_CONFIDENCE,
    })
    if (!gate.play) {
      return { played: false, visual: false, shouldStop: false, reason: gate.reason }
    }
    markSignalled(wordIndex)
    const played = playTone()
    const shouldStop = mode === MISTAKE_HANDLING_MODES.STOP_ON_MISTAKE
    return {
      played,
      visual: true,
      shouldStop,
      reason: gate.reason,
      mode,
    }
  }

  function dispose() {
    resetSessionSignals()
    buffer = null
    unlocked = false
    if (ownsContext && audioContext && typeof audioContext.close === 'function') {
      try { void audioContext.close() } catch { /* ignore */ }
    }
    audioContext = null
    ownsContext = false
  }

  return {
    get enabled() { return enabled },
    get mode() { return mode },
    get unlocked() { return unlocked },
    setMode(next) {
      if (Object.values(MISTAKE_HANDLING_MODES).includes(next)) mode = next
      return mode
    },
    setEnabled,
    preload,
    prepareAfterUserGesture,
    resetSessionSignals,
    hasSignalled,
    markSignalled,
    playTone,
    notifyWordTransition,
    dispose,
  }
}
