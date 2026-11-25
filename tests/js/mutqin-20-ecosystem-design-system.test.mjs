import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

const teacherCss = read('../../resources/js/views/TeacherDashboard.css')
const studentMarkers = read('../../resources/js/views/Dashboard.learner-teacher.css')
const parentVue = read('../../resources/js/views/ParentDashboard.vue')
const teacherVue = read('../../resources/js/views/TeacherDashboard.vue')
const studentVue = read('../../resources/js/views/Dashboard.vue')
const parentNav = read('../../resources/js/scripts/parent/constants.js')
const teacherNav = read('../../resources/js/scripts/teacher/constants.js')
const onboarding = read('../../resources/js/views/ConnectionOnboarding.vue')

const shells = [
  ['teacher', teacherVue],
  ['parent', parentVue],
  ['student', studentVue],
]
for (const [id, source] of shells) {
  assert.match(source, new RegExp(`data-platform-shell="${id}"`), `${id} dashboard declares platform shell`)
  assert.match(source, /teacher-dashboard/, `${id} reuses teacher dashboard shell classes`)
  assert.match(source, /TeacherNav/, `${id} uses shared TeacherNav`)
}

assert.match(parentNav, /from '\.\/navigation\.js'/, 'Parent nav is centralised in navigation module')
assert.match(parentNav, /parentNavActiveView/, 'Parent nav helpers exported from constants')
assert.match(teacherNav, /TEACHER_NAV/, 'Teacher nav is centralised in constants')

for (const token of [
  '--teacher-surface',
  '--teacher-line',
  '--teacher-accent',
  '--radius-card',
  '--control-height',
]) {
  assert.ok(teacherCss.includes(token), `Teacher design tokens expose ${token}`)
}

const studentSystem = studentMarkers.slice(studentMarkers.lastIndexOf('/* Student dashboard control system.'))
assert.ok(studentSystem.length > 500, 'Student shares canonical control system layer')
assert.match(teacherCss, /\.teacher-nav__link:focus-visible/, 'Teacher/parent mobile nav exposes keyboard focus')

assert.match(onboarding, /ConnectionOnboarding/, 'Auth onboarding view is wired')
assert.match(parentVue, /ParentPlatformSwitch|platform_switch/, 'Parent settings expose authorised platform switching')
assert.match(studentVue, /platform_switch_url|platform_switch/, 'Student settings expose authorised platform switching')

console.log('mutqin-20-ecosystem-design-system.test.mjs: ok')