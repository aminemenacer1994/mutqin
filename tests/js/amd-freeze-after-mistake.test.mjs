import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * Regression: stop-on-mistake must freeze live coloring at the confirmed
 * mistake word. Following words in the same alignment frame must stay pending.
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

function applyLiveStatusUpdateWithFreeze({
  current = [],
  statuses = [],
  stopOnMistake = true,
  alreadyFrozenAt = null,
  onMistake = null,
} = {}) {
  let next = current
  const changed = []
  let frozenAt = Number.isFinite(alreadyFrozenAt) ? Number(alreadyFrozenAt) : null

  for (let index = 0; index < current.length; index += 1) {
    if (frozenAt != null && index > frozenAt) {
      const word = (next === current ? current : next)[index] || current[index] || {}
      const statusValue = String(word.status || 'pending').toLowerCase()
      if (statusValue && statusValue !== 'pending' && statusValue !== 'notattempted') {
        if (next === current) next = current.slice()
        next[index] = { ...word, status: 'pending', note: 'Waiting for this word.' }
        changed.push(index)
      }
      continue
    }

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
    changed.push(index)

    const becameMistake = ['incorrect', 'omitted'].includes(String(nextWord.status || '').toLowerCase())
      && !['incorrect', 'omitted'].includes(String(word.status || '').toLowerCase())
    if (stopOnMistake && becameMistake) {
      frozenAt = index
      onMistake?.(index)
      for (let j = index + 1; j < current.length; j += 1) {
        const later = (next === current ? current : next)[j] || current[j] || {}
        const laterStatus = String(later.status || 'pending').toLowerCase()
        if (!laterStatus || laterStatus === 'pending' || laterStatus === 'notattempted') continue
        if (next === current) next = current.slice()
        next[j] = { ...later, status: 'pending', note: 'Waiting for this word.' }
        changed.push(j)
      }
      break
    }
  }

  return { next, frozenAt, changed }
}

// Same-frame incorrect + following correct must not color past the mistake.
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
  const { next, frozenAt } = applyLiveStatusUpdateWithFreeze({ current, statuses, stopOnMistake: true })
  assert.equal(frozenAt, 1)
  assert.equal(next[1].status, 'incorrect')
  assert.equal(next[2].status, 'pending', 'word after mistake must stay pending')
  assert.equal(next[3].status, 'pending', 'later words must stay pending')
}

// Once frozen, later batches cannot color following words.
{
  const current = [
    { text: 'a', status: 'correct' },
    { text: 'b', status: 'incorrect' },
    { text: 'c', status: 'pending' },
    { text: 'd', status: 'pending' },
  ]
  const statuses = [
    { status: 'correct' },
    { status: 'incorrect' },
    { status: 'correct' },
    { status: 'partial' },
  ]
  const { next, frozenAt } = applyLiveStatusUpdateWithFreeze({
    current,
    statuses,
    stopOnMistake: true,
    alreadyFrozenAt: 1,
  })
  assert.equal(frozenAt, 1)
  assert.equal(next[2].status, 'pending')
  assert.equal(next[3].status, 'pending')
}

// Continue mode may still advance past incorrect in the same frame.
{
  const current = [
    { text: 'a', status: 'pending' },
    { text: 'b', status: 'pending' },
  ]
  const statuses = [
    { status: 'incorrect' },
    { status: 'correct' },
  ]
  const { next, frozenAt } = applyLiveStatusUpdateWithFreeze({
    current,
    statuses,
    stopOnMistake: false,
  })
  assert.equal(frozenAt, null)
  assert.equal(next[0].status, 'incorrect')
  assert.equal(next[1].status, 'correct')
}

// Wiring: Memorisation.js must freeze coloring for stop-on-mistake.
{
  const js = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  assert.match(js, /amdFrozenAtWordIndex/)
  assert.match(js, /freezeAmdLiveWordColoring\(/)
  assert.match(js, /advanceOnIncorrect\s*=\s*!stopOnMistake/)
  assert.match(
    js,
    /maybeNotifyAmdConfirmedMistake\([\s\S]*?freezeAmdLiveWordColoring\(wordIndex\)[\s\S]*?stopAmdAndAssess/,
  )
  assert.match(
    js,
    /stopOnMistake && \(cue\?\.shouldStop \|\| Number\.isFinite\(this\.amdFrozenAtWordIndex\)\)/,
  )
  assert.match(js, /CONTINUE_AND_REVIEW/)
  assert.match(
    js,
    /Number\.isFinite\(this\.amdFrozenAtWordIndex\)[\s\S]*?amdEndingSoon[\s\S]*?_amdCompleting/,
  )
}

console.log('amd-freeze-after-mistake.test.mjs: ok')
