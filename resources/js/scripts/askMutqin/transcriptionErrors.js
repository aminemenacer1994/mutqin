/**
 * Normalize token-mint / axios failures so Find by voice can show the right copy
 * instead of a generic “couldn't reach the voice finder” for every error.
 *
 * @param {unknown} error
 * @returns {Error}
 */
export function normalizeTranscriptionTokenError(error) {
  const status = Number(error?.response?.status || 0)
  const payload = error?.response?.data && typeof error.response.data === 'object'
    ? error.response.data
    : {}
  const reason = String(payload?.reason || '').trim()
  const message = String(
    payload?.message
    || error?.message
    || 'transcription_unavailable',
  ).trim()

  const next = error instanceof Error ? error : new Error(message)
  if (!next.message) next.message = message

  if (reason === 'usage_cap' || /usage_cap|voice-check limit/i.test(message)) {
    next.code = 'usage_cap'
    return next
  }

  if (
    reason === 'plan_required'
    || status === 401
    || status === 403
    || /plan_required|needs a .* plan|upgrade/i.test(message)
  ) {
    next.code = 'plan_required'
    return next
  }

  if (
    status === 419
    || status === 429
    || status >= 500
    || payload?.available === false
    || reason === 'unavailable'
    || reason === 'rate_limit'
  ) {
    next.code = 'transcription_unavailable'
    return next
  }

  if (!next.code) {
    next.code = status > 0 ? 'transcription_unavailable' : 'network'
  }
  return next
}
