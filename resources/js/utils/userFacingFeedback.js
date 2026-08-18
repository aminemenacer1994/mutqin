/**
 * Beginner-friendly feedback — never expose internal timing / ASR tuning to learners.
 */

export const FORBIDDEN_USER_TIMING_TERMS = /timing buffer|confidence threshold|alignment window|latency|pacing coefficient/i

/** Notes that reveal backend waiting rather than a real mistake. */
export const INTERNAL_LIVE_WAITING_NOTE = /waiting for (?:this word|confirmation)|locked until/i

export function containsForbiddenUserTimingTerms(text = '') {
  return FORBIDDEN_USER_TIMING_TERMS.test(String(text || ''))
}

/**
 * @param {string} text
 * @param {string} [fallback]
 */
export function sanitizeUserFacingFeedback(text = '', fallback = '') {
  const raw = String(text || '').trim()
  const safeFallback = String(fallback || '').trim()
  if (!raw) return safeFallback
  if (containsForbiddenUserTimingTerms(raw)) return safeFallback
  return raw
}

/**
 * Sanitise hover / title notes on live word paint.
 *
 * @param {string} note
 * @param {{ status?: string, timingBuffered?: boolean, liveRecording?: boolean }} [options]
 */
export function sanitizeLiveWordNote(note = '', {
  status = '',
  timingBuffered = false,
  liveRecording = false,
} = {}) {
  if (timingBuffered) return ''

  const value = String(note || '').trim()
  if (!value) return ''
  if (containsForbiddenUserTimingTerms(value)) return ''

  const normalizedStatus = String(status || '').toLowerCase()
  const isPending = !normalizedStatus
    || normalizedStatus === 'pending'
    || normalizedStatus === 'notattempted'

  if (INTERNAL_LIVE_WAITING_NOTE.test(value)) return ''
  if (liveRecording && isPending) return ''

  return value
}
