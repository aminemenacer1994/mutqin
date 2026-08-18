import assert from 'node:assert/strict'
import test from 'node:test'
import { progressBarDisplay } from '../../resources/js/utils/progressDisplay.js'

test('progressBarDisplay returns empty bar at 0%', () => {
  const result = progressBarDisplay(0)
  assert.equal(result.percent, 0)
  assert.equal(result.fillWidth, '0%')
  assert.equal(result.hasProgress, false)
})

test('progressBarDisplay keeps accurate percent with visible fill for small values', () => {
  for (const value of [1, 2, 5, 50, 99]) {
    const result = progressBarDisplay(value)
    assert.equal(result.percent, value)
    assert.equal(result.hasProgress, true)
    assert.notEqual(result.fillWidth, '0%')
  }
})

test('progressBarDisplay shows full bar at 100%', () => {
  const result = progressBarDisplay(100)
  assert.equal(result.percent, 100)
  assert.equal(result.fillWidth, '100%')
  assert.equal(result.hasProgress, true)
})

test('progressBarDisplay clamps out-of-range values', () => {
  assert.equal(progressBarDisplay(-5).percent, 0)
  assert.equal(progressBarDisplay(150).percent, 100)
})
