import assert from 'node:assert/strict'
import {
  clampStatusesToConfirmedCursor,
  mergeLiveRecitationStatuses,
  resolveConfirmedWordIndex,
} from '../../resources/js/scripts/memorisationDetection/liveCursor.js'

// Reproduce the AMD freeze: skip holes as pending + later greens.
{
  const statuses = [
    { status: 'correct' },
    { status: 'correct' },
    { status: 'pending' }, // الرحمن dropped by ASR
    { status: 'pending' }, // الرحيم dropped by ASR
    { status: 'correct' },
    { status: 'correct' },
    { status: 'correct' },
  ]
  const confirmed = resolveConfirmedWordIndex(statuses)
  assert.equal(confirmed, 6, 'cursor soft-continues past live skip holes')

  const wiped = clampStatusesToConfirmedCursor(statuses, 2)
  assert.equal(wiped[4].status, 'pending', 'old clamp at the hole wiped later greens')

  const kept = clampStatusesToConfirmedCursor(statuses, 2, { keepSettledAhead: true })
  assert.equal(kept[4].status, 'correct', 'keepSettledAhead preserves later greens')
  assert.equal(kept[5].status, 'correct')
  assert.equal(kept[2].status, 'pending')
}

{
  const bothEnds = [
    { status: 'correct' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'pending' },
    { status: 'correct' },
    { status: 'correct' },
  ]
  const confirmed = resolveConfirmedWordIndex(bothEnds)
  assert.ok(confirmed < 5, 'a far-ahead green must not pull the cursor to the other end')
  const clamped = clampStatusesToConfirmedCursor(bothEnds, 0, { keepSettledAhead: true })
  assert.equal(clamped[0].status, 'correct')
  assert.equal(clamped[5].status, 'pending', 'isolated end greens must not stay painted')
  assert.equal(clamped[6].status, 'pending')
}

{
  const merged = mergeLiveRecitationStatuses(
    [
      { status: 'correct' },
      { status: 'pending' },
      { status: 'correct' },
      { status: 'correct' },
    ],
    [
      { status: 'correct' },
      { status: 'pending' },
      { status: 'correct' },
      { status: 'correct' },
    ],
    { confirmedOnly: true },
  )
  assert.deepEqual(
    merged.map((word) => word.status),
    ['correct', 'pending', 'correct', 'correct'],
  )
}

console.log('amd-skip-hole-soft-continue: ok')
