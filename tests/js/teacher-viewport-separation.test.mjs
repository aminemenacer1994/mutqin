import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const dash = read('resources/js/views/TeacherDashboard.vue')
const viewport = read('resources/js/scripts/teacher/viewport.js')
const mixin = read('resources/js/mixins/teacherViewportMixin.js')
const css = read('resources/js/views/TeacherDashboard.css')
const evidence = read('resources/js/views/TeacherEvidence.css')

assert.match(viewport, /TEACHER_SHELL_MOBILE_MQ/, 'Shell breakpoint centralised')
assert.match(viewport, /useTeacherViewport/, 'Composable exported')
assert.match(dash, /useTeacherViewport/, 'Dashboard binds viewport')
assert.match(dash, /data-teacher-viewport/, 'Viewport data attribute on shell')
assert.match(dash, /teacher-dashboard--mobile/, 'Mobile shell class')
assert.match(dash, /provide\('teacherIsMobileShell'/, 'Viewport provided to sections')
assert.match(mixin, /teacherIsMobileShell/, 'Shared inject mixin')

assert.match(css, /\[data-teacher-viewport="mobile"\].*teacher-hero--mobile/s, 'Mobile hero scoped to mobile viewport')
assert.match(css, /\[data-teacher-viewport="desktop"\].*teacher-hero--desktop/s, 'Desktop hero scoped to desktop viewport')
assert.match(evidence, /teacher-attendance--mobile-shell/, 'Attendance mobile UX isolated from desktop table')

const hero = read('resources/js/components/teacher/TeacherHero.vue')
const gettingStarted = read('resources/js/components/teacher/TeacherGettingStarted.vue')
const overview = read('resources/js/components/teacher/TeacherOverviewSection.vue')

assert.match(hero, /teacherViewportMixin/, 'Hero uses viewport mixin')
assert.match(hero, /teacher-hero--mobile/, 'Hero marks mobile layout')
assert.match(gettingStarted, /mobileShell/, 'Getting started is mobile-only surface')
assert.match(overview, /teacher-overview--mobile/, 'Overview separates mobile/desktop')
assert.match(overview, /mobileShell \? 'details' : 'section'/, 'Trends collapsible on mobile only')

console.log('teacher-viewport-separation.test.mjs: ok')