import assert from 'node:assert/strict'
import { applyTeacherTaskType, defaultAyahRange, resolveTeacherTaskType, surahAyahCount } from '../../resources/js/scripts/teacher/taskTypes.js'

assert.equal(surahAyahCount([], 2), 286)
assert.equal(surahAyahCount([], 1), 7)
assert.deepEqual(defaultAyahRange([], 2), { ayah_start: 1, ayah_end: 286 })
assert.equal(resolveTeacherTaskType('practice', 'manzil'), 'revision')
assert.equal(resolveTeacherTaskType('ai_recite', 'sabqi'), 'recitation_check')

const draft = { task_type: 'nazra', kind: 'practice', hifz_category: 'sabqi', recording_required: false }
assert.deepEqual(
  ['nazra', 'hifz', 'tajweed', 'revision', 'recitation_check'].map((type) => {
    const next = applyTeacherTaskType(draft, type)
    return [type, next.activity, next.kind, next.hifz_category, next.recording_required]
  }),
  [
    ['nazra', 'nazra', 'practice', 'sabqi', false],
    ['hifz', 'hifz', 'ai_recite', 'sabaq', true],
    ['tajweed', 'tajweed', 'ai_recite', 'sabqi', true],
    ['revision', 'revision', 'practice', 'sabqi', false],
    ['recitation_check', null, 'ai_recite', 'sabqi', false],
  ],
)

console.log('teacher-task-types.test.mjs: ok')
