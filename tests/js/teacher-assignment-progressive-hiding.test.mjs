import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  assignmentSupportsProgressiveHiding,
  mergeProgressiveHidingIntoSessionSettings,
  sanitizeTeacherProgressiveHidingSettings,
} from '../../resources/js/scripts/teacher/assignmentProgressiveHidingSettings.js'

const task = readFileSync(new URL('../../resources/js/components/teacher/TeacherTaskSheet.vue', import.meta.url), 'utf8')
const hidingFields = readFileSync(new URL('../../resources/js/components/teacher/TeacherAssignmentProgressiveHidingFields.vue', import.meta.url), 'utf8')

assert.ok(assignmentSupportsProgressiveHiding({ task_type: 'hifz', kind: 'practice' }))
assert.equal(assignmentSupportsProgressiveHiding({ task_type: 'hifz', kind: 'ai_recite', recording_required: true }), false)

const clean = sanitizeTeacherProgressiveHidingSettings({ enabled: true, blur_intensity: 20 })
assert.equal(clean.blur_intensity, 18)

const merged = mergeProgressiveHidingIntoSessionSettings({
  technique: 'talqin',
  progressive_hiding: { enabled: true },
})
assert.equal(merged.ok, true)
assert.equal(merged.session_settings.technique, 'blur')

assert.match(task, /TeacherAssignmentProgressiveHidingFields/)
assert.match(hidingFields, /teacher-form-field--full/)
assert.match(hidingFields, /assignment_progressive_hiding_enable/)
assert.match(hidingFields, /assignment_hiding_preview/)

console.log('teacher assignment progressive hiding ok')