/**
 * Live recitation cursor — confirmed position vs expected / candidate.
 *
 * Confirmed drives highlighting and Tajweed active state.
 * Candidate may track interim ASR for matching only — never for paint.
 * Expected is the next word the learner should recite (= confirmed cursor).
 */

export function isSettledLiveStatus(status = '') {
  const value = String(status || '').toLowerCase()
  return value === 'correct'
    || value === 'partial'
    || value === 'incorrect'
    || value === 'omitted'
    || value === 'skipped'
}

export function isPaintedLiveStatus(status = '') {
  const value = String(status || '').toLowerCase()
  return value === 'correct'
    || value === 'partial'
    || value === 'incorrect'
    || value === 'omitted'
}

/**
 * First unsettled index in a status list (= learner’s current confirmed place).
 * Never derived from reference-reciter timing or interim lookahead alone.
 */
export function resolveConfirmedWordIndex(statuses = [], options = {}) {
  if (Number.isFinite(options.frozenAt)) {
    return Math.max(0, Number(options.frozenAt))
  }
  const words = Array.isArray(statuses) ? statuses : []
  if (!words.length) return 0
  for (let i = 0; i < words.length; i += 1) {
    if (!isSettledLiveStatus(words[i]?.status)) return i
  }
  return Math.max(0, words.length - 1)
}

/**
 * Interim / hypothesis cursor — may sit ahead of confirmed, but must not paint.
 */
export function resolveCandidateWordIndex(statuses = [], options = {}) {
  return resolveConfirmedWordIndex(statuses, options)
}

/**
 * Next expected target for matching. Locked to the confirmed cursor so we never
 * “expect” a future word because a reciter clock or interim guess jumped ahead.
 */
export function resolveExpectedWordIndex({
  confirmedWordIndex = 0,
  candidateWordIndex = null,
  allowCandidate = false,
} = {}) {
  const confirmed = Math.max(0, Number(confirmedWordIndex) || 0)
  if (!allowCandidate) return confirmed
  const candidate = Number(candidateWordIndex)
  if (!Number.isFinite(candidate)) return confirmed
  // Candidate may only describe the same slot — never a future word.
  return Math.min(confirmed, Math.max(0, candidate))
}

/**
 * Active Tajweed segment follows the confirmed highlight only.
 */
export function resolveActiveTajweedSegmentIndex(confirmedWordIndex = 0) {
  return Math.max(0, Number(confirmedWordIndex) || 0)
}

/**
 * Build the four cursor fields from committed + optional interim status lists.
 */
export function buildLiveRecitationCursor({
  committedStatuses = [],
  candidateStatuses = null,
  frozenAt = null,
} = {}) {
  const confirmedWordIndex = resolveConfirmedWordIndex(committedStatuses, { frozenAt })
  const candidateWordIndex = resolveCandidateWordIndex(
    Array.isArray(candidateStatuses) ? candidateStatuses : committedStatuses,
    { frozenAt },
  )
  const expectedWordIndex = resolveExpectedWordIndex({
    confirmedWordIndex,
    candidateWordIndex,
    allowCandidate: false,
  })
  const activeTajweedSegmentIndex = resolveActiveTajweedSegmentIndex(confirmedWordIndex)
  return {
    expectedWordIndex,
    candidateWordIndex,
    confirmedWordIndex,
    activeTajweedSegmentIndex,
  }
}

/**
 * Strip paint from any word strictly ahead of the confirmed cursor.
 * Interim / optimistic statuses beyond confirmed become pending.
 */
export function clampStatusesToConfirmedCursor(statuses = [], confirmedWordIndex = 0) {
  const list = Array.isArray(statuses) ? statuses : []
  const cursor = Math.max(0, Number(confirmedWordIndex) || 0)
  return list.map((word, index) => {
    if (index <= cursor) return word || { status: 'pending' }
    if (!isPaintedLiveStatus(word?.status)) return word || { status: 'pending' }
    return {
      ...(word || {}),
      status: 'pending',
      note: word?.note || 'Waiting for confirmation.',
      actual: undefined,
      similarity: undefined,
      confidence: undefined,
      interim: false,
      hypothesis: false,
    }
  })
}

/**
 * Merge committed + interim display statuses.
 * When `confirmedOnly` is true (AMD live), interim never paints — including the
 * current slot — so progress cannot jump ahead of confirmed speech.
 */
export function mergeLiveRecitationStatuses(committedStatuses = [], displayStatuses = [], options = {}) {
  const committed = Array.isArray(committedStatuses) ? committedStatuses : []
  const display = Array.isArray(displayStatuses) ? displayStatuses : []
  const maxLength = Math.max(committed.length, display.length)
  const confirmedOnly = options.confirmedOnly === true
  const protectAgainstInterimRed = options.protectAgainstInterimRed === true || confirmedOnly
  const confirmedCursor = resolveConfirmedWordIndex(committed)

  const liveWordStatusSeverity = (status = '') => {
    const value = String(status || '').toLowerCase()
    if (value === 'incorrect' || value === 'omitted') return 3
    if (value === 'partial' || value === 'skipped') return 2
    if (value === 'correct') return 1
    return 0
  }
  const isStickyLiveIssueStatus = (status = '') => {
    const value = String(status || '').toLowerCase()
    return value === 'incorrect'
      || value === 'partial'
      || value === 'omitted'
      || value === 'skipped'
  }
  const pickSticky = (current, incoming) => {
    if (!current) return incoming
    if (!incoming) return current
    if (!isStickyLiveIssueStatus(current.status)) return incoming
    if (liveWordStatusSeverity(incoming.status) > liveWordStatusSeverity(current.status)) {
      return { ...current, ...incoming }
    }
    return {
      ...incoming,
      ...current,
      status: current.status,
      note: current.note || incoming.note,
    }
  }

  const merged = Array.from({ length: maxLength }, (_, index) => {
    const confirmed = committed[index] || null
    const live = display[index] || null

    if (confirmedOnly) {
      if (confirmed && confirmed.status && confirmed.status !== 'pending') {
        return confirmed
      }
      return {
        ...(confirmed || live || {}),
        status: 'pending',
        note: confirmed?.note || 'Waiting for confirmation.',
      }
    }

    if (protectAgainstInterimRed && live?.status === 'incorrect'
      && (!confirmed || confirmed.status === 'pending' || confirmed.status === 'correct')) {
      return confirmed && confirmed.status && confirmed.status !== 'pending'
        ? confirmed
        : { ...(confirmed || live), status: 'pending', note: confirmed?.note || 'Waiting for confirmation.' }
    }

    if (isStickyLiveIssueStatus(confirmed?.status) || isStickyLiveIssueStatus(live?.status)) {
      return pickSticky(confirmed, live) || pickSticky(live, confirmed)
    }

    // Soft live paint only at/behind the confirmed cursor — never ahead.
    if (index > confirmedCursor) {
      if (confirmed && confirmed.status && confirmed.status !== 'pending') return confirmed
      return {
        ...(confirmed || live || {}),
        status: 'pending',
        note: confirmed?.note || 'Waiting for confirmation.',
      }
    }

    if (live && ['correct', 'partial', 'incorrect', 'omitted'].includes(live.status)
      && (!confirmed || confirmed.status === 'pending')) {
      return live
    }
    if (confirmed && confirmed.status && confirmed.status !== 'pending') return confirmed
    if (!live && !confirmed) return { status: 'pending', note: 'Waiting for this word.' }
    if (live && ['correct', 'partial', 'incorrect'].includes(live.status)) return live
    return { ...(live || confirmed), status: 'pending', note: confirmed?.note || 'Waiting for confirmation.' }
  })

  return confirmedOnly
    ? clampStatusesToConfirmedCursor(merged, confirmedCursor)
    : clampStatusesToConfirmedCursor(merged, confirmedCursor)
}
