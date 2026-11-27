import assert from 'node:assert/strict'
import fs from 'node:fs'

const dashboard = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const learner = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherSection.vue', import.meta.url), 'utf8')
const teacher = fs.readFileSync(new URL('../../resources/js/components/teacher/profile/TeacherStudentProfileTasks.vue', import.meta.url), 'utf8')
const plan = fs.readFileSync(new URL('../../resources/js/components/teacher/profile/TeacherStudentProfilePlan.vue', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../../resources/js/views/Dashboard.learner-teacher.css', import.meta.url), 'utf8')

for (const feeling of ['easy', 'manageable', 'difficult', 'need_help']) {
  assert.match(dashboard, new RegExp(`['"]${feeling}['"]`), `Student flow includes ${feeling}`)
}

assert.match(dashboard, /assignment_self_assessment_submit_without/, 'Self-assessment remains optional before submission')
assert.match(dashboard, /saveLearnerSelfAssessment/, 'A student can add the assessment after submission')
assert.match(learner, /@click="requestSubmissionAssessment"/, 'Completed submission exposes the after-submission action')
const assessmentMethod = learner.match(/requestSubmissionAssessment\(\) \{([\s\S]*?)\n    \},/)[1]
const submission = { recipient_id: 42 }
const order = []
new Function(assessmentMethod).call({
  selectedSubmission: submission,
  closeSubmission() { this.selectedSubmission = null; order.push('close') },
  $emit(event, value) { assert.equal(event, 'self-assess'); assert.equal(value, submission); order.push('open') },
})
assert.deepEqual(order, ['close', 'open'], 'Submission closes before assessment opens, preserving its record')
assert.match(teacher, /selectedSelfAssessment/, 'Teacher submission review shows the linked assessment')
assert.match(teacher, /assignment_self_assessment_assign_revision/, 'Teacher can act on difficult feedback from the review')
assert.match(plan, /assignReflection/, 'Learning-plan view can use the reflection to assign revision')
assert.match(css, /@media \(max-width: 575\.98px\)/, 'Self-assessment dialog has a mobile layout')
assert.match(css, /var\(--dash-surface\)/, 'Self-assessment uses theme-aware surfaces for dark mode')

console.log('assignment-self-assessment.test.mjs: ok')
