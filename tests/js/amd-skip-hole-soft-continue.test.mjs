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
