import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * AMD memorisation check always keeps reciting the full range.
 * Mistakes are marked but must not freeze or block later words.
 */

function pickStickyLiveWordStatus(current = null, incoming = null) {
  if (!current) return incoming
  if (!incoming) return current
  const severity = (status = '') => {
    const value = String(status || '').toLowerCase()
    if (value === 'incorrect' || value === 'omitted') return 3
    if (value === 'partial' || value === 'skipped') return 2
    if (value === 'correct') return 1
    return 0
  }
  const stickyIssue = (status = '') => {
    const value = String(status || '').toLowerCase()
    return value === 'incorrect' || value === 'partial' || value === 'omitted' || value === 'skipped'
  }
  if (!stickyIssue(current.status)) return incoming
  if (String(incoming.status || '').toLowerCase() === 'correct') {
    return { ...current, ...incoming, status: 'correct' }
  }
  if (severity(incoming.status) > severity(current.status)) {
    return { ...current, ...incoming }
  }
  return {
    ...incoming,
    ...current,
    status: current.status,
    note: current.note || incoming.note,
  }
}

function applyLiveStatusUpdateContinue({
  current = [],
  statuses = [],
} = {}) {
  let next = current
  for (let index = 0; index < current.length; index += 1) {
    const word = current[index] || {}
    const status = statuses[index] || {}
    const sticky = pickStickyLiveWordStatus(
      { ...word, status: word.status || 'pending' },
      { ...status, status: status.status || 'pending' },
    )
    const nextWord = {
      ...word,
      ...sticky,
      status: sticky?.status || status.status || 'pending',
    }
    if ((word.status || 'pending') === nextWord.status) continue
    if (next === current) next = current.slice()
    next[index] = nextWord
  }
  return next
}

// Same-frame incorrect + following correct must still colour the following word.
{
  const current = [
    { text: 'a', status: 'correct' },
    { text: 'b', status: 'pending' },
    { text: 'c', status: 'pending' },
    { text: 'd', status: 'pending' },
  ]
  const statuses = [
    { status: 'correct' },
    { status: 'incorrect' },
    { status: 'correct' },
    { status: 'correct' },
  ]
  const next = applyLiveStatusUpdateContinue({ current, statuses })
  assert.equal(next[1].status, 'incorrect')
  assert.equal(next[2].status, 'correct', 'later words keep updating after a mistake')
  assert.equal(next[3].status, 'correct')
}

// Wiring: stop-on-mistake freeze path removed; full-range continue is fixed.
{
  const js = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  assert.match(js, /partialAdvances = true/)
  assert.match(js, /advanceOnIncorrect = true/)
  assert.match(js, /CONTINUE_AND_REVIEW/)
  assert.doesNotMatch(js, /amdFrozenAtWordIndex/)
  assert.doesNotMatch(js, /freezeAmdLiveWordColoring\(/)
  assert.doesNotMatch(js, /applyAmdStopOnMistakeClamp\(/)
  assert.doesNotMatch(js, /STOP_ON_MISTAKE/)
}

console.log('amd-freeze-after-mistake.test.mjs: ok')
