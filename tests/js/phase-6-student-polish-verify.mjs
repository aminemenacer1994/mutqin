import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const dashboard = read('resources/js/views/Dashboard.vue')
const settings = read('resources/js/components/teacher/LearnerSettingsSection.vue')
const learnerSection = read('resources/js/components/teacher/LearnerTeacherSection.vue')
const learnerCss = read('resources/js/views/Dashboard.learner-teacher.css')
const messages = read('resources/js/components/teacher/LearnerStudentMessages.vue')
const en = JSON.parse(read('resources/js/locales/en.json'))

assert.match(dashboard, /LearnerStudentMessages/, 'Messages pane uses the student messaging workspace')
assert.match(dashboard, /studentDirectThreads/, 'Direct teacher threads feed the messages workspace')
assert.match(settings, /dash-btn dash-btn--secondary dash-btn--sm teacher-account__action/, 'Settings actions use the shared dash buttons')
assert.doesNotMatch(settings, /btn btn-outline-secondary btn-sm teacher-account__action/, 'Settings no longer uses legacy bootstrap outline buttons')

assert.match(learnerSection, /test-id="learner-submission-modal"/, 'Submission detail uses DashModalRoot')
assert.doesNotMatch(learnerSection, /<Teleport to="body">\s*<div v-if="selectedSubmission"/, 'Submission detail no longer uses a manual dialog shell')
assert.match(learnerSection, /openDirectThreadByTeacherId/, 'Teacher message deep links resolve on the learning section')
assert.match(learnerSection, /learner-assignment-modal__foot/, 'Assignment detail modals expose a sticky footer row')

assert.match(learnerCss, /\.dash-modal__foot/, 'Shared modal footers exist for sticky actions')
assert.match(learnerCss, /dash-student-dialog--has-foot/, 'Large student dialogs reserve space for footers')

assert.match(messages, /learner-messages-workspace/, 'Student messages workspace markup is present')
assert.ok(en.dashboard?.messages_teachers_title, 'Student messages copy is localised')

console.log('phase-6-student-polish-verify.mjs: ok')