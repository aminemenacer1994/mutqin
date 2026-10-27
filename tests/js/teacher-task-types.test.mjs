import assert from 'node:assert/strict'
import { defaultAyahRange, resolveTeacherTaskType, surahAyahCount } from '../../resources/js/scripts/teacher/taskTypes.js'

assert.equal(surahAyahCount([], 2), 286)
assert.equal(surahAyahCount([], 1), 7)
assert.deepEqual(defaultAyahRange([], 2), { ayah_start: 1, ayah_end: 286 })
assert.equal(resolveTeacherTaskType('practice', 'manzil'), 'revision')
assert.equal(resolveTeacherTaskType('ai_recite', 'sabqi'), 'recitation_check')

console.log('teacher-task-types.test.mjs: ok')
