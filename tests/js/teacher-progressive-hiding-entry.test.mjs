import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync(new URL('../../resources/js/views/TeacherDashboard.vue', import.meta.url), 'utf8')
const profile = readFileSync(new URL('../../resources/js/components/teacher/TeacherStudentProfileSection.vue', import.meta.url), 'utf8')
const practice = readFileSync(new URL('../../resources/js/components/teacher/profile/TeacherStudentProfilePractice.vue', import.meta.url), 'utf8')
const memorisation = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../resources/js/views/TeacherDashboard.css', import.meta.url), 'utf8')
const locale = readFileSync(new URL('../../resources/js/locales/en.json', import.meta.url), 'utf8')

assert.match(dashboard, /:memorisation-url="auth\.memorisation_url \|\| '\/memorisation'"/, 'The approved memorisation route reaches the student profile')
assert.match(profile, /:memorisation-url="memorisationUrl"/, 'The route is forwarded to the practice subview')
assert.match(practice, /progressiveHidingHref/, 'The teacher practice view exposes the real tool entry')
assert.match(practice, /searchParams\.set\('technique', 'blur'\)/, 'The entry explicitly requests Progressive Hiding')
assert.match(practice, /teacher\.progressive_hiding_scope/, 'The scope is shown alongside the entry action')
assert.match(locale, /It does not change this student's records/, 'The scope is honest about student data')
assert.match(memorisation, /const technique = techniqueParam === 'blur' \? 'blur' : null/, 'Only the supported explicit tool is accepted from the URL')
assert.match(memorisation, /explicitTechnique: Boolean\(entry\.technique\)/, 'A direct entry is distinct from a recommendation')
assert.match(memorisation, /options\.explicitTechnique && techniqueId === 'blur'/, 'Only a deliberate launch can turn Progressive Hiding on')
assert.match(memorisation, /'attempt', 'technique'/, 'The consumed tool URL is removed after it is applied')
assert.match(css, /\.teacher-beginner-tool__action \.btn \{ width: 100%; min-height: 44px; \}/, 'The primary mobile action retains a usable touch target')

console.log('teacher progressive hiding entry ok')
