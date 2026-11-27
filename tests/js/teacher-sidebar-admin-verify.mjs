import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const nav = read('resources/js/components/teacher/TeacherNav.vue')
const constants = read('resources/js/scripts/teacher/constants.js')
const teacherDash = read('resources/js/views/TeacherDashboard.vue')
const css = read('resources/js/views/TeacherDashboard.css')

assert.match(constants, /TEACHER_MOBILE_PRIMARY_NAV_IDS/, 'Mobile primary nav ids exported')
assert.match(constants, /teacherMobileMoreNav/, 'Mobile more menu helper exported')
assert.match(constants, /teacherMobilePrimaryNav/, 'Mobile primary menu helper exported')

assert.match(constants, /TEACHER_ADMIN_NAV/, 'Admin nav config exists')
assert.match(constants, /id: 'attendance'[\s\S]*id: 'settings'/, 'Admin contains attendance and account')
assert.doesNotMatch(constants.match(/export const TEACHER_ADMIN_NAV = \[[\s\S]*?\]/)?.[0] || '', /id: 'messages'/, 'Messages removed from admin nav')

const mainNav = constants.match(/export const TEACHER_NAV = \[[\s\S]*?\]/)?.[0] || ''
assert.match(mainNav, /id: 'plans'/, 'Learning plans stay in desktop primary nav')
assert.match(mainNav, /id: 'messages'/, 'Messages in primary nav')
assert.match(mainNav, /mobile: false/, 'Secondary destinations hidden from mobile bottom bar')
assert.doesNotMatch(mainNav, /id: 'attendance'/, 'Attendance removed from primary nav')

assert.match(constants, /overview.*students.*assignments.*messages/s, 'Mobile primary matches Home / Students / Tasks / Messages')

assert.match(nav, /adminItems/, 'TeacherNav accepts admin items')
assert.match(nav, /adminIcon/, 'Admin toggle icon configurable')
assert.match(nav, /teacher-nav__admin-children/, 'Admin child list exists')
assert.match(nav, /aria-expanded/, 'Admin toggle exposes aria-expanded')
assert.match(nav, /ADMIN_EXPANDED_KEY|mutqin\.teacher\.adminNavExpanded/, 'Admin preference persisted')
assert.match(nav, /method="POST"/, 'Logout uses POST form')
assert.match(nav, /bi-box-arrow-right/, 'Logout reuses existing icon')

assert.match(teacherDash, /teacherMobilePrimary/, 'Teacher dashboard wires mobile primary nav')
assert.match(teacherDash, /teacherMobileMore/, 'Teacher dashboard wires mobile more menu')
assert.match(teacherDash, /data-teacher-viewport/, 'Shell exposes mobile vs desktop viewport')
assert.match(teacherDash, /teacher\.nav_more/, 'Mobile more label key')
assert.match(teacherDash, /:show-account="false"/, 'Account moves under admin')
assert.match(teacherDash, /logout_url/, 'Logout URL passed to nav')
assert.match(teacherDash, /view === 'messages'/, 'Messages route wired')

assert.match(css, /teacher-nav__admin-child/, 'Admin child indent styles')
assert.match(css, /prefers-reduced-motion/, 'Reduced motion respected')

console.log('teacher-sidebar-admin-verify.mjs: ok')