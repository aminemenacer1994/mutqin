import assert from 'node:assert/strict'

/**
 * Mirrors Memorisation.js sticky live-word severity so regressions are caught
 * without mounting the full Vue view.
 */
function liveWordStatusSeverity(status = '') {
  const value = String(status || '').toLowerCase()
  if (value === 'incorrect' || value === 'omitted') return 3
  if (value === 'partial' || value === 'skipped') return 2
  if (value === 'correct') return 1
  return 0
}

function isStickyLiveIssueStatus(status = '') {
  const value = String(status || '').toLowerCase()
  return value === 'incorrect'
    || value === 'partial'
    || value === 'omitted'
    || value === 'skipped'
}

function pickStickyLiveWordStatus(current = null, incoming = null) {
  if (!current) return incoming
  if (!incoming) return current
  if (!isStickyLiveIssueStatus(current.status)) return incoming
  const incomingStatus = String(incoming.status || '').toLowerCase()
  if (incomingStatus === 'correct') {
    return { ...current, ...incoming, status: 'correct' }
  }
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

function mergeLiveRecitationStatuses(committedStatuses = [], displayStatuses = []) {
  const committed = Array.isArray(committedStatuses) ? committedStatuses : []
  const display = Array.isArray(displayStatuses) ? displayStatuses : []
  const maxLength = Math.max(committed.length, display.length)
  return Array.from({ length: maxLength }, (_, index) => {
    const confirmed = committed[index] || null
    const live = display[index] || null
    if (isStickyLiveIssueStatus(confirmed?.status) || isStickyLiveIssueStatus(live?.status)) {
      return pickStickyLiveWordStatus(confirmed, live)
        || pickStickyLiveWordStatus(live, confirmed)
    }
    if (live && ['correct', 'partial', 'incorrect', 'omitted'].includes(live.status)
      && (!confirmed || confirmed.status === 'pending')) {
      return live
    }
    if (confirmed && confirmed.status && confirmed.status !== 'pending') return confirmed
    if (!live && !confirmed) return { status: 'pending' }
    if (live && ['correct', 'partial', 'incorrect'].includes(live.status)) return live
    return { ...(live || confirmed), status: 'pending' }
  })
}

function applyLiveStatusUpdate(current = [], statuses = []) {
  return current.map((word, index) => {
    const status = statuses[index] || {}
    const sticky = pickStickyLiveWordStatus(
      { ...word, status: word.status || 'pending' },
      { ...status, status: status.status || 'pending' },
    )
    return {
      ...word,
      ...sticky,
      status: sticky?.status || status.status || 'pending',
    }
  })
}

{
  const merged = mergeLiveRecitationStatuses(
    [{ status: 'incorrect', note: 'wrong' }],
    [{ status: 'correct', note: 'rematch' }],
  )
  assert.equal(merged[0].status, 'correct', 'red may recover to green on rematch')
}

{
  const merged = mergeLiveRecitationStatuses(
    [{ status: 'partial', note: 'close' }],
    [{ status: 'correct', note: 'later hear' }],
  )
  assert.equal(merged[0].status, 'correct', 'amber may recover to green')
}

{
  const merged = mergeLiveRecitationStatuses(
    [{ status: 'partial' }],
    [{ status: 'incorrect' }],
  )
  assert.equal(merged[0].status, 'incorrect', 'amber may still worsen to red')
}

{
  const next = applyLiveStatusUpdate(
    [{ status: 'incorrect', text: 'الحمد' }],
    [{ status: 'correct', text: 'الحمد' }],
  )
  assert.equal(next[0].status, 'correct', 'applyLiveStatusUpdate recovers red when rematched correctly')
}

{
  const next = applyLiveStatusUpdate(
    [{ status: 'skipped', text: 'الحمد' }],
    [{ status: 'correct', text: 'الحمد' }],
  )
  assert.equal(next[0].status, 'correct', 'skipped may recover to green on rematch')
}

{
  const next = applyLiveStatusUpdate(
    [{ status: 'pending', text: 'الحمد' }],
    [{ status: 'correct', text: 'الحمد' }],
  )
  assert.equal(next[0].status, 'correct', 'pending may still become green on first hear')
}

{
  const next = applyLiveStatusUpdate(
    [{ status: 'incorrect', text: 'الحمد' }],
    [{ status: 'partial', text: 'الحمد' }],
  )
  assert.equal(next[0].status, 'incorrect', 'red must not soften back to amber')
}

console.log('live-word-status-sticky.test.mjs: ok')
