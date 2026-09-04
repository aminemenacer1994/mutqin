let sharedContext = null
let lastBeepAt = 0

/**
 * @returns {AudioContext|null}
 */
export function ensureRecordingBeepAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return null
  try {
    if (sharedContext && sharedContext.state === 'closed') {
      sharedContext = null
    }
    if (!sharedContext) {
      sharedContext = new AudioContextCtor()
    }
    return sharedContext
  } catch (error) {
    console.warn('Recording beep AudioContext unavailable:', error)
    return null
  }
}

/**
 * Short single-tone cue when AI recording begins.
 *
 * @param {{ minGapMs?: number, force?: boolean }} [options]
 * @returns {boolean}
 */
export function playRecordingStartBeep(options = {}) {
  if (typeof window === 'undefined') return false
  const minGapMs = Number.isFinite(Number(options.minGapMs)) ? Number(options.minGapMs) : 1200
  const now = Date.now()
  if (!options.force && lastBeepAt > 0 && (now - lastBeepAt) < minGapMs) {
    return false
  }
  lastBeepAt = now
  try {
    const context = ensureRecordingBeepAudioContext()
    if (!context) return false
    const play = () => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.18)
    }
    if (context.state === 'suspended') {
      const resume = context.resume?.()
      if (resume?.then) {
        resume.then(play).catch(play)
      } else {
        play()
      }
    } else {
      play()
    }
    return true
  } catch (error) {
    console.warn('Recording start beep failed:', error)
    return false
  }
}

export function resetRecordingStartBeepDebounce() {
  lastBeepAt = 0
}

export default {
  ensureRecordingBeepAudioContext,
  playRecordingStartBeep,
  resetRecordingStartBeepDebounce,
}
