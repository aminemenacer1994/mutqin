import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const learnerSection = read('resources/js/components/teacher/LearnerTeacherSection.vue')
const playbackModal = read('resources/js/components/shared/LearnerAttemptPlaybackModal.vue')
const reciteModal = read('resources/js/components/teacher/TeacherReciteEvidenceModal.vue')
const taskThread = read('resources/js/components/teacher/LearnerTaskThreadPanel.vue')
const dashboard = read('resources/js/views/Dashboard.vue')
const settings = read('resources/js/components/teacher/LearnerSettingsSection.vue')

assert.match(learnerSection, /dash-student-dialog--feedback-list/, 'Feedback drawer uses the student dialog shell')
assert.match(learnerSection, /dash-student-dialog--results/, 'Results drawer uses the student dialog shell')
assert.match(learnerSection, /shell="student"/, 'Mushaf evidence modal uses the student shell')
assert.doesNotMatch(learnerSection, /learner-feedback-list-modal/, 'Legacy feedback modal class names were removed')
assert.match(learnerSection, /dash-btn--primary dash-btn--sm[\s\S]*practice_again/, 'Submission modal exposes one primary CTA')

assert.match(playbackModal, /DashModalRoot/, 'Playback modal uses DashModalRoot for scroll lock and focus')
assert.match(playbackModal, /dash-student-dialog--wide/, 'Playback modal uses the wide student variant')
assert.doesNotMatch(playbackModal, /dash-drawer-open/, 'Playback modal no longer toggles legacy drawer body classes')

assert.match(reciteModal, /shell !== 'student'[\s\S]*TeacherDialog/, 'Teacher shell keeps TeacherDialog')
assert.match(reciteModal, /DashModalRoot[\s\S]*dash-student-dialog/, 'Student shell uses DashModalRoot')

assert.match(taskThread, /dash-student-dialog--thread/, 'Task conversation modal uses the thread student variant')

assert.match(dashboard, /DashModalRoot[\s\S]*learner-self-assessment/, 'Self-assessment uses DashModalRoot')
assert.match(dashboard, /dash-student-dialog--has-foot/, 'Self-assessment reserves footer space')

assert.match(settings, /dash-btn dash-btn--secondary dash-btn--sm teacher-account__action/, 'Settings actions use shared dash buttons')

console.log('phase-10-student-modals-verify.mjs: ok')