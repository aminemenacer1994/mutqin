import assert from 'node:assert/strict'
import {
  clampStatusesToFreezePoint,
  findFirstBlockingMistakeIndex,
} from '../../resources/js/scripts/memorisationDetection/liveCursor.js'

{
  const statuses = [
    { status: 'correct' },
    { status: 'incorrect' },
    { status: 'correct' },
    { status: 'partial' },
  ]
  assert.equal(findFirstBlockingMistakeIndex(statuses), 1)
  const clamped = clampStatusesToFreezePoint(statuses, 1)
  assert.equal(clamped[1].status, 'incorrect')
  assert.equal(clamped[2].status, 'pending')
  assert.equal(clamped[3].status, 'pending')
}

console.log('amd-stop-on-mistake-clamp.test.mjs: ok')
