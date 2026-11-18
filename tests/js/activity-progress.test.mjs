import assert from 'node:assert/strict'
import { activityProgressPercent, progressMeterStyle } from '../../resources/js/scripts/teacher/activityProgress.js'

assert.equal(activityProgressPercent(0, 0), 0)
assert.equal(activityProgressPercent(0, 1), 0)
assert.equal(activityProgressPercent(1, 2), 50)
assert.equal(activityProgressPercent(1, 1), 100)
assert.equal(activityProgressPercent(4, 2), 100)
assert.deepEqual(progressMeterStyle(0, 1), { width: '0px' })
assert.deepEqual(progressMeterStyle(1, 2), { width: '50%' })
assert.deepEqual(progressMeterStyle(1, 1), { width: '100%' })

console.log('activity-progress.test.mjs: ok')
