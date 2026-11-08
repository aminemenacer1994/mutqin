/** Continuous quiet time required after speech before a request is complete. */
export const SESSION_VOICE_SILENCE_MS = 3000

/**
 * Safety cap so a stuck microphone cannot listen forever.
 * The assistant tells the user about this limit up front.
 */
export const SESSION_VOICE_MAX_LISTEN_MS = 120000

/**
 * Silence is measured only after speech has been heard.
 * Any later speech clears the quiet stretch and starts it again.
 */
export function createSilenceTracker({ silenceMs = SESSION_VOICE_SILENCE_MS } = {}) {
  const required = Math.max(1, Number(silenceMs) || SESSION_VOICE_SILENCE_MS)
  let speechSeen = false
  let silenceStartedAt = 0

  return {
    speechSeen: () => speechSeen,
    push(speaking, now) {
      const timestamp = Number(now)
      if (speaking) {
        speechSeen = true
        silenceStartedAt = 0
        return { phase: 'speaking', speechSeen: true, silenceFor: 0 }
      }
      if (!speechSeen) {
        return { phase: 'waiting', speechSeen: false, silenceFor: 0 }
      }
      if (!silenceStartedAt) silenceStartedAt = timestamp
      const silenceFor = Math.max(0, timestamp - silenceStartedAt)
      if (silenceFor >= required) {
        return { phase: 'finished', speechSeen: true, silenceFor }
      }
      return { phase: 'silence', speechSeen: true, silenceFor }
    },
  }
}
