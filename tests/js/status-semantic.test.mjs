import assert from 'node:assert/strict'
import {
  SCORE_HIGH,
  SCORE_LOW,
  scoreBadgeTone,
  teacherStatusToneFromDisplay,
  hifzCategoryTone,
  normalizeDueTone,
} from '../../resources/js/scripts/teacher/statusSemantic.js'

assert.equal(SCORE_HIGH, 85)
assert.equal(SCORE_LOW, 70)

assert.equal(scoreBadgeTone(90), 'good')
assert.equal(scoreBadgeTone(85), 'focus')
assert.equal(scoreBadgeTone(70), 'focus')
assert.equal(scoreBadgeTone(69), 'warn')
assert.equal(scoreBadgeTone(null), 'muted')

assert.equal(teacherStatusToneFromDisplay('DONE'), 'good')
assert.equal(teacherStatusToneFromDisplay('OVERDUE'), 'danger')
assert.equal(teacherStatusToneFromDisplay('IN_PROGRESS'), 'info')
assert.equal(teacherStatusToneFromDisplay('WAITING_REVIEW'), 'info')
assert.equal(teacherStatusToneFromDisplay('NOT_STARTED'), 'muted')

assert.equal(normalizeDueTone('danger'), 'danger')
assert.equal(normalizeDueTone('warning'), 'focus')
assert.equal(normalizeDueTone('neutral'), 'muted')

assert.equal(hifzCategoryTone('sabqi'), 'focus')
assert.equal(hifzCategoryTone('sabaq'), 'focus-purple')
assert.equal(hifzCategoryTone('manzil'), 'focus-purple')

console.log('status-semantic.test.mjs: ok')
