import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const section = fs.readFileSync(
  path.join(root, 'resources/js/components/teacher/LearnerTeacherSection.vue'),
  'utf8',
)
const login = fs.readFileSync(path.join(root, 'resources/views/auth/login.blade.php'), 'utf8')
const dashboard = fs.readFileSync(path.join(root, 'resources/js/views/Dashboard.vue'), 'utf8')

assert.match(section, /learner-teacher__intro/, 'learner intro header in template')
assert.match(section, /learner_teacher_fallback/, 'teacher name fallback while loading')
assert.match(section, /support-thread-update/, 'thread updates emit to parent store')
assert.doesNotMatch(section, /this\.support\s*=\s*\{/, 'must not mutate support prop locally')

assert.match(dashboard, /applyAssignmentThreadUpdate/, 'parent patches support on send')
assert.match(dashboard, /patchLearnerSupportThread/, 'parent handles thread refetch')

assert.match(login, /@include\('partials\.demo-login-card'\)/, 'demo card included from server partial')
assert.doesNotMatch(
  fs.readFileSync(path.join(root, 'resources/js/app.js'), 'utf8'),
  /DEMO_STUDENT_EMAIL/,
  'demo credentials must not ship in main JS bundle',
)

console.log('learner-dashboard-fixes.test.mjs: ok')
