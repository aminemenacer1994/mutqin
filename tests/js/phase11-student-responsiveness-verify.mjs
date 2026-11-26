/**
 * Phase 11 static guards + optional live audit hook.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const studentCss = fs.readFileSync(path.join(root, 'resources/js/views/Dashboard.student.css'), 'utf8')

assert.match(
  studentCss,
  /\.dash-progress-modal \.dash-fb-review-word[\s\S]*?var\(--dash-card-bg\)/,
  'Progress modal review words use theme tokens (not hardcoded #fff)',
)

assert.doesNotMatch(
  studentCss,
  /\.dash-progress-modal \.dash-fb-review-word[\s\S]{0,200}background:\s*#fff;/,
  'Progress modal review words must not use light-only #fff background',
)

assert.match(
  studentCss,
  /learner-teacher__progress-badge[\s\S]*?var\(--dash-card-bg\)/,
  'My learning progress badge uses dash card token',
)

const teacherCss = fs.readFileSync(path.join(root, 'resources/js/views/TeacherDashboard.css'), 'utf8')
assert.match(teacherCss, /min-height: var\(--teacher-control-height\)/, 'Shared actions retain their standard touch target')

assert.match(
  studentCss,
  /@media \(max-width: 767\.98px\)[\s\S]*?\.dash-progress-modal__close[\s\S]*?44px/,
  'Progress modal close control is touch-sized on mobile',
)

console.log('phase11-student-responsiveness-verify: static student CSS guards passed')