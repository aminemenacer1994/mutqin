import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

const onboarding = read('../../resources/js/views/ConnectionOnboarding.vue')
const teacherDash = read('../../resources/js/views/TeacherDashboard.vue')
const useTeacher = read('../../resources/js/scripts/composables/useTeacherDashboard.js')
const locales = read('../../resources/js/locales/en.json')

assert.match(onboarding, /connections_work_independently/, 'Connection onboarding documents independent-teacher path')
assert.match(onboarding, /connections_skip/, 'Connection onboarding exposes skippable steps')
assert.match(teacherDash, /TeacherNav/, 'Teacher workspace uses shared navigation')
assert.match(teacherDash, /TeacherTaskSheet|assignments/, 'Teacher workspace wires assignment UI')
assert.match(useTeacher, /defaultAssignmentForm|assignmentForm/, 'Teacher dashboard composable exposes assignment defaults')

const en = JSON.parse(locales)
assert.ok(en.teacher?.nav_assignments_short, 'Teacher mobile nav has compact assignment label')
assert.ok(en.teacher?.nav_home, 'Teacher mobile home label')
assert.ok(en.teacher?.nav_tasks_short, 'Teacher mobile tasks label')
assert.ok(en.teacher?.nav_more, 'Teacher mobile more label')
assert.ok(en.parent?.platform_switch_hint, 'Platform switch copy is localised')

console.log('phase4-teacher-onboarding-verify.mjs: ok')