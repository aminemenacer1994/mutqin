import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL(`../../resources/js/views/${p}`,import.meta.url),'utf8')
const dashboard=read('Dashboard.vue'), css=read('Dashboard.student.css'), tokens=read('Dashboard.student-tokens.css'), teacher=read('TeacherDashboard.css')
assert.doesNotMatch(dashboard, /user-dashboard--progress/, 'Student no longer activates the legacy Source Sans override')
assert.match(teacher, /font-family: "Plus Jakarta Sans", "Source Sans 3"/, 'Teacher owns the workspace font')
assert.match(dashboard, /<TeacherPageHeader/)
assert.match(tokens, /--dash-type-body: 15px/)
assert.match(tokens, /--dash-type-secondary: 14px/)
assert.match(css, /font-family: var\(--quran-font/, 'Arabic retains the Qur’an font')
assert.match(css, /word-break: normal/, 'Metrics retain natural wrapping')
assert.doesNotMatch(css, /text-transform: uppercase/, 'Student content does not force uppercase labels')
console.log('student-dashboard-typography.test.mjs: ok')
